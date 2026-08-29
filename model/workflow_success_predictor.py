from .trainer import TabularTrainer
class WorkflowSuccessPredictor(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("success", "classification", output_dir, seed)
