"""Generate synthetic training data for the risk prediction model."""
import numpy as np
from typing import Tuple


def generate_training_data(n_samples: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic patient vitals data with labels.
    
    Features: [heartRate, spo2, temperature, bpSystolic, bpDiastolic, respiratoryRate]
    Labels: 0 = low risk, 1 = medium risk, 2 = critical risk
    """
    np.random.seed(42)
    
    # Normal vitals (low risk) - 40%
    n_normal = int(n_samples * 0.4)
    normal = np.column_stack([
        np.random.normal(75, 10, n_normal),      # heartRate
        np.random.normal(97, 1.5, n_normal),      # spo2
        np.random.normal(36.8, 0.3, n_normal),    # temperature
        np.random.normal(120, 10, n_normal),       # bpSystolic
        np.random.normal(78, 8, n_normal),         # bpDiastolic
        np.random.normal(16, 2, n_normal),         # respiratoryRate
    ])
    normal_labels = np.zeros(n_normal)
    
    # Moderate vitals (medium risk) - 35%
    n_moderate = int(n_samples * 0.35)
    moderate = np.column_stack([
        np.random.normal(100, 8, n_moderate),
        np.random.normal(93, 2, n_moderate),
        np.random.normal(38.2, 0.4, n_moderate),
        np.random.normal(145, 12, n_moderate),
        np.random.normal(90, 8, n_moderate),
        np.random.normal(22, 3, n_moderate),
    ])
    moderate_labels = np.ones(n_moderate)
    
    # Critical vitals (high risk) - 25%
    n_critical = n_samples - n_normal - n_moderate
    critical = np.column_stack([
        np.random.normal(125, 12, n_critical),
        np.random.normal(87, 3, n_critical),
        np.random.normal(39.5, 0.5, n_critical),
        np.random.normal(170, 15, n_critical),
        np.random.normal(105, 10, n_critical),
        np.random.normal(30, 4, n_critical),
    ])
    critical_labels = np.full(n_critical, 2)
    
    # Combine and shuffle
    X = np.vstack([normal, moderate, critical])
    y = np.concatenate([normal_labels, moderate_labels, critical_labels])
    
    # Clip values to realistic ranges
    X[:, 0] = np.clip(X[:, 0], 30, 200)  # heartRate
    X[:, 1] = np.clip(X[:, 1], 60, 100)  # spo2
    X[:, 2] = np.clip(X[:, 2], 34, 42)   # temperature
    X[:, 3] = np.clip(X[:, 3], 70, 220)  # bpSystolic
    X[:, 4] = np.clip(X[:, 4], 40, 140)  # bpDiastolic
    X[:, 5] = np.clip(X[:, 5], 8, 45)    # respiratoryRate
    
    # Shuffle
    indices = np.random.permutation(len(X))
    return X[indices], y[indices]


def generate_bed_allocation_data(n_samples: int = 500) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic data for bed allocation recommendations.
    
    Features: [severity_score, needs_ventilator, needs_isolation, age, risk_score]
    Labels: 0 = normal, 1 = step-down, 2 = icu, 3 = isolation
    """
    np.random.seed(123)
    
    X = np.column_stack([
        np.random.uniform(0, 1, n_samples),          # severity_score
        np.random.binomial(1, 0.3, n_samples),        # needs_ventilator
        np.random.binomial(1, 0.15, n_samples),       # needs_isolation
        np.random.normal(60, 15, n_samples),           # age
        np.random.uniform(0, 1, n_samples),            # risk_score
    ])
    
    X[:, 3] = np.clip(X[:, 3], 18, 100)
    
    # Rule-based labeling
    y = np.zeros(n_samples)
    for i in range(n_samples):
        if X[i, 2] == 1:  # needs isolation
            y[i] = 3
        elif X[i, 0] > 0.7 or X[i, 4] > 0.7:  # high severity or risk
            y[i] = 2  # ICU
        elif X[i, 0] > 0.4 or X[i, 4] > 0.4:
            y[i] = 1  # Step-down
        else:
            y[i] = 0  # Normal
    
    return X, y
