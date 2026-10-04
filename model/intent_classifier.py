# Copyright 2026 Prism AI Labs.
# SPDX-License-Identifier: Apache-2.0
from .trainer import TabularTrainer
class IntentClassifier(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("intent", "classification", output_dir, seed)
