"""
Ground-Truth Evaluation Service.

Evaluates the live ML + policy pipeline against a FIXED held-out test split
that was carved out before training and never seen by the model (see
ml_engine.get_held_out_set / _train_default_model). All metrics below are
computed directly from that run - nothing is pre-set or floored.

Honesty note: because held-out fraud/normal transactions genuinely overlap
(see fraud_data_generator.py), these numbers will not be 99%+ across the
board. That's intentional - it's what an unrigged evaluation looks like.
"""
from typing import Dict, Any
from datetime import datetime
import numpy as np
import xgboost as xgb

import app.services.ml_engine as ml_engine
from app.services.ml_engine import FEATURE_NAMES, get_held_out_set
from app.services.policy_engine import policy_engine


class ModelEvaluationService:
    def run_benchmark(self, sample_count: int = 200) -> Dict[str, Any]:
        """
        Runs the fixed held-out set (or a stratified sub-sample of it) through
        the live model + policy engine and computes an honest confusion
        matrix, precision/recall/F1/accuracy, rank-sum AUC, and the
        false-positive / false-negative cost implied by the policy engine's
        own expected-loss model - in INR, using the synthetic held-out
        transaction amounts.
        """
        X, y_true, amounts = get_held_out_set()
        total_available = len(y_true)

        n = min(sample_count, total_available) if sample_count else total_available
        if n < total_available:
            rng = np.random.default_rng(1337)
            fraud_idx = np.where(y_true == 1)[0]
            normal_idx = np.where(y_true == 0)[0]
            frac = n / total_available
            take_fraud = max(1, int(round(len(fraud_idx) * frac)))
            take_normal = n - take_fraud
            sel = np.concatenate([
                rng.choice(fraud_idx, size=min(take_fraud, len(fraud_idx)), replace=False),
                rng.choice(normal_idx, size=min(take_normal, len(normal_idx)), replace=False),
            ])
            X, y_true, amounts = X[sel], y_true[sel], amounts[sel]
            n = len(y_true)

        dmat = xgb.DMatrix(X, feature_names=FEATURE_NAMES)
        probas = ml_engine._MODEL.predict(dmat) * 100.0

        tp = fp = tn = fn = 0
        fp_cost_inr = 0.0
        fn_cost_inr = 0.0
        scores_and_labels = []

        for i in range(n):
            score = float(probas[i])
            ground_truth = int(y_true[i])
            amount = float(amounts[i])
            is_new_dev = bool(X[i][3])
            decision = policy_engine.decide(score, is_new_device=is_new_dev, amount=amount)

            predicted_fraud = 1 if decision in ("BLOCK", "STEP-UP") else 0
            scores_and_labels.append((score, ground_truth))

            if ground_truth == 1 and predicted_fraud == 1:
                tp += 1
            elif ground_truth == 0 and predicted_fraud == 1:
                fp += 1
                loss = policy_engine.calculate_expected_loss(score, amount)
                fp_cost_inr += loss["cost_step_up_inr"] if decision == "STEP-UP" else loss["cost_block_inr"]
            elif ground_truth == 0 and predicted_fraud == 0:
                tn += 1
            elif ground_truth == 1 and predicted_fraud == 0:
                fn += 1
                fn_cost_inr += amount

        precision = round((tp / (tp + fp)) * 100, 2) if (tp + fp) > 0 else 0.0
        recall = round((tp / (tp + fn)) * 100, 2) if (tp + fn) > 0 else 0.0
        f1 = round((2 * precision * recall / (precision + recall)), 2) if (precision + recall) > 0 else 0.0
        accuracy = round(((tp + tn) / n) * 100, 2)

        scores_and_labels.sort(key=lambda x: x[0])
        n_pos = sum(1 for _, l in scores_and_labels if l == 1)
        n_neg = sum(1 for _, l in scores_and_labels if l == 0)
        rank_sum = sum(i + 1 for i, (_, l) in enumerate(scores_and_labels) if l == 1)
        auc = round((rank_sum - (n_pos * (n_pos + 1) / 2)) / (n_pos * n_neg), 3) if n_pos * n_neg > 0 else 0.5

        return {
            "dataset_note": (
                f"Fixed held-out split ({total_available} txns never used in training), "
                f"{n} evaluated here. Fraud and normal classes overlap by design; "
                f"see fraud_data_generator.py for the generating distributions."
            ),
            "evaluated_at": datetime.utcnow().strftime("%H:%M:%S UTC"),
            "sample_count": n,
            "held_out_pool_size": total_available,
            "confusion_matrix": {
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn,
            },
            "metrics": {
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "accuracy": accuracy,
                "roc_auc": auc,
            },
            "false_positive_cost": {
                "count": fp,
                "total_inr": round(fp_cost_inr, 2),
                "avg_inr_per_false_positive": round(fp_cost_inr / fp, 2) if fp > 0 else 0.0,
                "note": "Cost of legitimate transactions wrongly challenged/blocked, priced via the policy engine's own expected-loss model.",
            },
            "false_negative_cost": {
                "count": fn,
                "total_inr": round(fn_cost_inr, 2),
                "avg_inr_per_false_negative": round(fn_cost_inr / fn, 2) if fn > 0 else 0.0,
                "note": "Realized fraud loss from fraud that was approved (full transaction amount).",
            },
            "active_thresholds": {
                "approve": policy_engine.approve_threshold,
                "step_up": policy_engine.step_up_threshold,
            },
        }


evaluation_service = ModelEvaluationService()
