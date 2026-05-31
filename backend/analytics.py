import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional

def calculate_price_stability(prices: List[float]) -> float:
    """
    Calculates the standard deviation of prices for a specific game 
    to determine its "Price Stability".
    Lower standard deviation means higher stability.
    """
    if not prices or len(prices) < 2:
        return 0.0
    return float(np.std(prices))

def calculate_weighted_moving_average(prices: List[float], weights: List[float]) -> float:
    """
    Calculates the weighted moving average given a list of prices and their corresponding weights.
    More recent prices should have higher weights.
    """
    if not prices or not weights or len(prices) != len(weights):
        return sum(prices) / len(prices) if prices else 0.0
    
    return float(np.average(prices, weights=weights))

def detect_price_surge(current_price: float, historical_prices_14_days: List[float]) -> Dict:
    """
    Volatility Detection: Calculates a Surge Index.
    A "Price Surge" is flagged when the current price exceeds a 
    14-day weighted moving average by more than 20%.
    """
    if not historical_prices_14_days:
        return {"surge_detected": False, "surge_index": 0.0, "wma": current_price}
        
    num_days = len(historical_prices_14_days)
    
    # Generate weights: linear weighting where most recent days have higher weights
    # e.g., if num_days=14, weights are [1, 2, ..., 14]
    weights = [i + 1 for i in range(num_days)]
    
    wma = calculate_weighted_moving_average(historical_prices_14_days, weights)
    
    if wma == 0:
         return {"surge_detected": current_price > 0, "surge_index": float('inf'), "wma": 0.0}

    # Surge Index is the percentage increase over the WMA
    surge_index = ((current_price - wma) / wma) * 100
    
    surge_detected = surge_index > 20.0
    
    return {
        "surge_detected": surge_detected,
        "surge_index": round(surge_index, 2),
        "wma": round(wma, 2),
        "current_price": round(current_price, 2)
    }

def calculate_value_score(current_price: float, historical_low: float) -> float:
    """
    Economic Filtering: Calculates Value Score (Current Price vs. Historical Low).
    Higher score indicates better value (closer to or below historical low).
    """
    if current_price <= 0:
        return 100.0 # Free game
    if historical_low <= 0:
         return 0.0 # Can't divide by zero, and if historical low was free, any price is bad value

    # If current price is equal to historical low, ratio is 1.
    # Score is inversely proportional to ratio.
    ratio = current_price / historical_low
    # Let's define score out of 100. A ratio of 1 (current == low) gets 100.
    # A ratio of 2 (current is double the low) gets 50.
    score = (1 / ratio) * 100
    return min(100.0, max(0.0, score))
