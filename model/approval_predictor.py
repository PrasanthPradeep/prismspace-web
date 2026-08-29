from .trainer import TabularTrainer
class ApprovalPredictor(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("approval", "classification", output_dir, seed)
