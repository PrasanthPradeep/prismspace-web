# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
from .trainer import TabularTrainer
class LatencyPredictor(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("latency", "regression", output_dir, seed)
class CostPredictor(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("cost", "regression", output_dir, seed)
