from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import random

app = FastAPI()

class RecommendRequest(BaseModel):
    articles: List[str]
    liked: List[int]
    bookmarked: List[int]
    read: List[int]
    interest_category_indexes: List[int]
    similar_topic_indexes: List[int] = []
    exclude_indexes: List[int] = []
    top_k: int = 5

@app.post("/recommend")
def recommend(req: RecommendRequest):
    try:
        if not req.articles or len(req.articles) == 0:
            return {"recommended_indexes": []}
        
        vectorizer = TfidfVectorizer(stop_words="english", max_features=500, min_df=1, max_df=0.95)
        article_vectors = vectorizer.fit_transform(req.articles)

        user_vector = np.zeros(article_vectors.shape[1])

        def apply_weight(indexes, weight):
            nonlocal user_vector
            for i in indexes:
                if 0 <= i < article_vectors.shape[0]:
                    user_vector += article_vectors[i].toarray()[0] * weight

        # Apply weights: similar topics are strongest (articles from categories/tags user liked)
        apply_weight(req.similar_topic_indexes, 4)
        apply_weight(req.liked, 3)
        apply_weight(req.bookmarked, 3)
        apply_weight(req.read, 2)
        apply_weight(req.interest_category_indexes, 1)

        norm = np.linalg.norm(user_vector)
        if norm == 0:
            # If user has no interactions, recommend from interest categories
            if req.interest_category_indexes:
                ranked = list(req.interest_category_indexes)
            else:
                # Fallback: return articles in order
                ranked = list(range(len(req.articles)))
        else:
            # Normalize user vector
            user_vector = user_vector / norm
            
            similarity = cosine_similarity(
                user_vector.reshape(1, -1),
                article_vectors
            )[0]

            ranked = similarity.argsort()[::-1]
            ranked = [int(i) for i in ranked]

        # Filter out articles user has already interacted with
        seen_articles = set(req.liked) | set(req.bookmarked) | set(req.read) | set(req.exclude_indexes)
        ranked = [i for i in ranked if i not in seen_articles]

        # Prioritize articles from similar topics
        similar_topic_set = set(req.similar_topic_indexes)
        same_topic_articles = [i for i in ranked if i in similar_topic_set]
        other_articles = [i for i in ranked if i not in similar_topic_set]
        
        # Group similar articles by similarity score to add variety
        if len(same_topic_articles) > 2:
            # Split top articles (high confidence) from others
            high_confidence = same_topic_articles[:len(same_topic_articles)//2]
            lower_confidence = same_topic_articles[len(same_topic_articles)//2:]
            # Shuffle lower confidence group for diversity
            random.shuffle(lower_confidence)
            same_topic_articles = high_confidence + lower_confidence
        
        # Shuffle other articles for diversity
        random.shuffle(other_articles)
        
        # Combine: same topics first, then others
        ranked = same_topic_articles + other_articles

        # Return top_k recommendations
        result = ranked[:req.top_k]
        
        print(f"User interactions - Liked: {req.liked}, Bookmarked: {req.bookmarked}, Read: {req.read}")
        print(f"Similar topics: {len(same_topic_articles)} found, Interest categories: {req.interest_category_indexes}")
        print(f"Excluded (recently shown): {req.exclude_indexes}")
        print(f"Top 10 ranked: {ranked[:10] if len(ranked) > 0 else []}")
        print(f"Final recommendations: {result}")
        return {
            "recommended_indexes": result
        }
    except Exception as e:
        print(f"Error in recommendation: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"recommended_indexes": [], "error": str(e)}
