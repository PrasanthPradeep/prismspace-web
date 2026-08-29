from .trainer import TabularTrainer
class AnomalyDetector(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("anomaly", "classification", output_dir, seed)
