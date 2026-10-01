# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
from .trainer import TabularTrainer
class WorkflowSuccessPredictor(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("success", "classification", output_dir, seed)
