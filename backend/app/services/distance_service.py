from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres (Haversine)."""
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(min(1.0, sqrt(a)))


def fuzz_coordinates(lat: float, lng: float) -> tuple[float, float]:
    """Coarsen coordinates to roughly a 1 km grid so exact addresses stay private."""
    return round(lat, 2), round(lng, 2)
