from .trainer import TabularTrainer
class IntentClassifier(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("intent", "classification", output_dir, seed)
