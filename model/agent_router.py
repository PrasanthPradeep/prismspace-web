from .trainer import TabularTrainer
class AgentRouter(TabularTrainer):
    def __init__(self, output_dir, seed=42): super().__init__("agent", "multilabel", output_dir, seed)
