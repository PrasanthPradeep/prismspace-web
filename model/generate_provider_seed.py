# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""Generate a seed provider-routing dataset for the PrismSpace provider router.

Maps realistic prompts to the Hive provider best suited for each task type,
based on documented provider strengths (speed, context length, multimodal,
code, safety, privacy).  This is a bootstrap dataset — replace it with
measured production telemetry as soon as practical.

Usage:
    python -m model.generate_provider_seed --output-dir model/datasets/training/curated/provider
    python -m model.generate_provider_seed --samples-per-provider 200
    python -m model.generate_provider_seed --dry-run
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ── Provider-keyed prompt templates ────────────────────────────────────────
# Each provider has tasks it is expected to handle best based on publicly
# documented strengths.  Templates use {slot} placeholders filled at random.

PROVIDER_TEMPLATES: dict[str, list[str]] = {
    # ── OpenAI: general reasoning, code, structured output ─────────────
    "openai": [
        "Write a Python function that {code_task}",
        "Debug this code: {code_snippet}",
        "Generate a {output_format} schema for {domain}",
        "Explain the time complexity of {algorithm}",
        "Review this pull request diff and suggest improvements: {diff_desc}",
        "Create a comprehensive test suite for {component}",
        "Refactor this function to use {pattern}",
        "Write SQL to {sql_task}",
        "Implement a REST API endpoint for {api_task}",
        "Convert this pseudocode to working {language} code",
        "Solve this algorithmic problem: {algo_problem}",
        "Write a detailed code review for {code_context}",
        "Create a CI/CD pipeline configuration for {deploy_target}",
        "Optimize this database query: {query_desc}",
        "Generate TypeScript types from this JSON: {json_desc}",
        "Build a React component that {ui_task}",
        "Write a shell script to automate {devops_task}",
        "Explain the difference between {concept_a} and {concept_b} in {tech_domain}",
        "Design a system architecture for {system_desc}",
        "Create unit tests for this {language} class: {class_desc}",
    ],
    # ── Anthropic: safety, nuance, long-context analysis ───────────────
    "anthropic": [
        "Review this {doc_length} {compliance_type} document on {policy_domain} for {risk_factor}",
        "Analyze {doc_length} {policy_domain} for {risk_factor} and compliance risks",
        "Evaluate this {compliance_type} guidelines for {policy_domain} regarding {risk_factor}",
        "Analyze this legal document for compliance risks: {doc_desc}",
        "Review this content for potential harm or bias: {content_desc}",
        "Summarize this {page_count}-page research paper: {paper_topic}",
        "Draft a sensitive response to this customer complaint: {complaint}",
        "Evaluate the ethical implications of {scenario}",
        "Write a balanced analysis of {controversial_topic}",
        "Review this HR policy for fairness and inclusivity: {policy_desc}",
        "Analyze this long conversation thread and extract key decisions: {thread_desc}",
        "Help me understand both sides of {debate_topic}",
        "Draft a thoughtful rejection letter for {rejection_context}",
        "Assess the safety risks of deploying {ai_system}",
        "Review this {doc_type} for regulatory compliance",
        "Provide a nuanced analysis of {complex_situation}",
        "Help me navigate this ethical dilemma: {dilemma}",
        "Summarize the main arguments in this {length} document about {topic}",
        "Draft a crisis communication plan for {crisis_scenario}",
        "Analyze the sentiment and tone of this customer feedback collection",
        "Write a diversity and inclusion assessment for {org_context}",
        "Review this medical information for accuracy and patient safety",
        "Create a content moderation policy for {platform_type}",
    ],
    # ── Google: multimodal, translation, large-context ─────────────────
    "google": [
        "Translate this {source_lang} {doc_type_google} to {target_lang} with {style_guide}",
        "Convert this {source_lang} {doc_type_google} into {target_lang} preserving {style_guide}",
        "Localize this {doc_type_google} from {source_lang} to {target_lang} for {market}",
        "Describe what's in this image: {image_desc}",
        "Translate this paragraph from {source_lang} to {target_lang}: {text_sample}",
        "Analyze this chart and extract the key data points",
        "Process this scanned document and extract structured data",
        "Generate a summary of this video transcript: {video_topic}",
        "Translate this technical documentation to {target_lang}",
        "Compare these two images and describe the differences",
        "Extract text from this handwritten note",
        "Analyze the visual design of this {design_type} and suggest improvements",
        "Translate this {source_lang} user interface to {target_lang}",
        "Describe the objects and relationships in this diagram",
        "Convert this {source_lang} marketing copy for {target_lang} audience",
        "Analyze this infographic and provide a text summary",
        "Translate and localize this product listing for {market}",
        "Process this receipt image and extract line items",
        "Identify the landmarks in this photograph",
        "Translate this multilingual customer support conversation",
        "Analyze this architectural blueprint and list the rooms",
        "Describe the data trends shown in this dashboard screenshot",
        "Transcribe and translate this audio clip from {source_lang}",
    ],
    # ── Groq: speed-critical, short completions, real-time ────────────
    "groq": [
        "Perform {speed_adj} {groq_task} on {groq_domain}",
        "Execute {speed_adj} {groq_task} for {groq_domain}",
        "Run {speed_adj} inference for {groq_domain} to perform {groq_task}",
        "Fast triage this incoming event: {event}",
        "Real-time streaming classification: {user_input}",
        "Low-latency token stream for interactive chat: {chat_prompt}",
        "Instant JSON schema validation for API payload: {api_payload}",
        "Sub-50ms intent detection for voice assistant: {voice_command}",
        "Rapid sentiment scoring for live support stream: {support_msg}",
        "High-throughput classification of ticket: {ticket_desc}",
        "Extract entities with zero queue delay: {short_text}",
        "Real-time autocomplete suggestion for editor: {prefix}",
        "Quick binary spam detection on incoming webhook: {webhook_body}",
        "Fast turn-taking response generation for conversation: {dialog_turn}",
        "Emergency alert severity classification: {alert_text}",
        "Extract user action intent in under 100ms: {cli_command}",
        "Instant keyword tagging for streaming news feed: {news_headline}",
        "Ultra-fast PII check on customer form input: {form_field}",
        "Classify this support ticket: {ticket_desc}",
        "Extract the intent from: {user_message}",
        "Is this message spam? {message}",
        "Sentiment analysis: {review_text}",
        "Generate a one-line response to: {chat_message}",
        "Parse this {format} and return JSON: {data_sample}",
        "Autocomplete: {partial_sentence}",
        "Categorize this feedback as positive, negative, or neutral",
        "Quick answer: {factual_question}",
        "Classify this email as {category_options}",
        "Route this query to the correct department: {query}",
        "Generate a concise TL;DR for: {paragraph}",
        "Validate this input format: {input_string}",
        "Classify the urgency level of this alert: {alert_desc}",
    ],
    # ── NVIDIA: on-prem, privacy, batch inference ──────────────────────
    "nvidia": [
        "Run {security_level} {nvidia_task} on {hardware_target} for {enterprise_data}",
        "Execute {security_level} {nvidia_task} using {hardware_target} on {enterprise_data}",
        "Deploy {security_level} {nvidia_task} on {hardware_target} to process {enterprise_data}",
        "Run private on-premise inference with NVIDIA NIM: {nim_task}",
        "Analyze this classified air-gapped document: {classified_doc}",
        "Deploy TensorRT-LLM optimized model for local batch: {trt_batch}",
        "Process HIPAA-protected patient record on local Triton server: {hipaa_data}",
        "Analyze proprietary trade-secret semiconductor schematic: {chip_spec}",
        "Run sovereign defense simulation analysis offline: {defense_sim}",
        "Audit internal banking ledger on isolated air-gapped node: {banking_ledger}",
        "Perform local GPU cluster batch embedding generation: {gpu_batch}",
        "Process confidential aerospace flight telemetry locally: {telemetry_data}",
        "Run secure on-premise compliance audit on source tree: {private_repo}",
        "Analyze sensitive HR whistleblower report on internal server: {hr_report}",
        "Execute local GPU-accelerated molecular dynamic screening: {biomed_data}",
        "Perform air-gapped cryptographic key ceremony audit: {crypto_audit}",
        "Score confidential enterprise loan portfolio on local cluster: {loan_data}",
        "Generate private documentation embeddings on isolated server: {wiki_data}",
        "Process this confidential financial report: {report_desc}",
        "Analyze this patient health record: {health_desc}",
        "Run inference on this proprietary dataset: {dataset_desc}",
        "Classify these internal documents: {doc_batch}",
        "Process this batch of {count} customer records",
        "Analyze this trade-secret engineering specification",
        "Generate embeddings for this private knowledge base: {kb_desc}",
        "Run NER on these restricted legal filings",
        "Process this air-gapped government document: {gov_doc}",
        "Analyze this internal audit log for anomalies",
        "Score these {count} loan applications in batch",
        "Generate summaries for this confidential HR review batch",
        "Process this restricted medical imaging report",
        "Run compliance checks on these internal communications",
        "Analyze this proprietary codebase for vulnerabilities",
        "Classify this batch of internal support tickets offline",
        "Process this defense contractor specification document",
        "Run batch sentiment analysis on employee survey responses",
        "Generate redacted summaries of these sealed court documents",
        "Analyze this HIPAA-protected dataset locally",
    ],
}

# ── Slot fillers ───────────────────────────────────────────────────────────

SLOT_FILLERS: dict[str, list[str]] = {
    "doc_length": ["100-page", "50-page", "comprehensive", "multi-section", "detailed", "full-text", "unredacted", "draft", "exhaustive", "multi-jurisdiction"],
    "compliance_type": ["legal", "ethical", "regulatory", "constitutional", "HR", "corporate", "environmental", "safety", "governance", "whistleblower"],
    "policy_domain": ["healthcare disclosure", "employment agreement", "financial audit", "terms of service", "clinical protocol", "privacy notice", "supplier code of conduct", "board resolution"],
    "risk_factor": ["anti-bias compliance", "ethical hazards", "legal liability", "fairness violations", "regulatory exposure", "patient safety", "confidentiality leaks", "statutory non-compliance"],
    "doc_type_google": ["user manual", "legal contract", "medical summary", "technical documentation", "press release", "tourist guide", "academic abstract", "e-commerce catalog"],
    "style_guide": ["formal business tone", "localized colloquial phrasing", "technical precision", "fluent natural prose"],
    "speed_adj": ["instant", "sub-50ms", "low-latency", "real-time", "streaming", "rapid", "high-throughput", "immediate", "ultra-fast", "zero-queue"],
    "groq_task": ["sentiment analysis", "intent classification", "token streaming", "entity extraction", "spam detection", "syntax parsing", "autocomplete prediction", "anomaly triage", "query routing", "emergency alert scoring"],
    "groq_domain": ["customer chat", "live video feed", "mobile checkout", "voice assistant", "IoT telemetry", "support ticket", "search query", "webhook payload", "trading event", "authentication request"],
    "security_level": ["air-gapped", "on-premise", "private", "HIPAA-compliant", "classified", "sovereign cloud", "isolated", "hardware-attested", "confidential", "restricted"],
    "nvidia_task": ["TensorRT-LLM batch inference", "Triton server deployment", "CUDA kernel acceleration", "embedding indexing", "distributed fine-tuning", "FP8 quantization", "model serving", "vector search compilation", "gradient checkpointing", "kernel optimization"],
    "hardware_target": ["NVIDIA DGX H100 cluster", "HGX A100 node", "on-premise Jetson edge device", "private L40S server", "isolated GPU enclave"],
    "enterprise_data": ["patient health records", "defense contractor specifications", "proprietary algorithmic trading core", "semiconductor tape-out schematics", "banking transaction ledgers", "legal discovery repositories", "corporate whistleblower reports", "molecular dynamic simulations", "government satellite telemetry", "confidential patent filings"],
    "event": ["user rage-clicking submit button", "payment gateway timeout on checkout", "websocket disconnect during live stream", "burst of 429 rate-limit errors", "failed multi-factor auth challenge", "sudden traffic spike on search endpoint", "deadlock detected on worker node", "unhandled exception in checkout controller"],
    "user_input": ["can you quickly check if my order was cancelled?", "what is the current status of ticket 4892?", "does this discount code apply to shoes?", "resend verification email please", "how do i reset my password in the app?"],
    "chat_prompt": ["summarize the last sentence quickly", "give a 10-word confirmation message", "say yes or no: is this account active?", "translate hello to japanese", "explain HTTP 302 in one sentence"],
    "api_payload": ["user signup json with nested profile", "stripe webhook checkout.session.completed", "github push event with 12 commits", "slack slash command payload", "datadog alert notification webhook"],
    "voice_command": ["turn off living room lights and set alarm for 7am", "what is the weather in Seattle right now?", "skip to the next track on spotify", "mute the microphone and pause playback", "navigate to the nearest coffee shop"],
    "support_msg": ["I have been waiting for two hours and nobody is replying!", "The new update completely fixed my issue thank you so much", "I was double-charged on my credit card this morning", "Where can I find the invoice for my enterprise account?"],
    "short_text": ["Acme Corp announced 200M funding led by Sequoia in Menlo Park", "Dr. Sarah Chen presented new Alzheimer results at Stanford Hospital", "Apple launched M4 iPad Pro in Cupertino yesterday"],
    "prefix": ["def calculate_moving_average(prices, window):", "const handleFormSubmit = async (e) => {", "SELECT user_id, COUNT(*) FROM events GROUP BY", "docker run -d -p 8080:8080 --name web-service"],
    "webhook_body": ["URGENT: Click here to claim your $5000 crypto reward", "Your scheduled Zoom meeting starts in 10 minutes", "Security alert: new login from Chrome on Windows in Berlin"],
    "dialog_turn": ["User says: That works, can you also send me a receipt?", "User says: No wait, I meant the annual plan not monthly.", "User says: Thanks, goodbye!"],
    "alert_text": ["P0: Database primary replica connection pool exhausted", "P3: Disk usage on dev cluster at 82%", "P1: Auth service error rate exceeded 5% SLA"],
    "cli_command": ["git push --force origin main", "kubectl scale deployment/api-server --replicas=10", "docker system prune -a --volumes", "terraform apply -auto-approve"],
    "news_headline": ["Fed holds interest rates steady amid slowing inflation", "SpaceX Starship completes fourth orbital test flight", "OpenAI unveils new flagship model with real-time audio"],
    "form_field": ["SSN: 000-12-3456 in comments box", "Credit card 4111-2222-3333-4444 in support request", "Standard phone number +1-415-555-0199 entered"],
    "nim_task": ["Llama-3-70B instruction tuning on private cluster", "Mistral-Large inference inside isolated VPC", "real-time speech recognition on edge Jetson node", "high-throughput embedding generation for 50M docs", "vLLM batch throughput benchmarking on 8x H100s"],
    "classified_doc": ["DoD joint all-domain command and control architecture", "DARPA autonomous navigation protocol briefing", "air-gapped naval communications encryption spec", "classified orbital payload telemetry transmission format"],
    "trt_batch": ["5000 concurrent embeddings on HGX H100 system", "100000 customer feedback records batch classification", "financial transaction risk scoring at 50000 req/sec", "FP8 quantized transformer model latency profiling"],
    "hipaa_data": ["Mayo Clinic oncology clinical trial patient records", "Cleveland Clinic cardiology surgical outcome registry", "Johns Hopkins pediatric genomic sequencing database", "Kaiser Permanente electronic health record audit log"],
    "chip_spec": ["next-gen 2nm GAAFET transistor layout parasitic extraction", "optical interconnect transceiver latency simulation log", "high-bandwidth memory HBM3e physical verification report", "RISC-V out-of-order execution pipeline hazard analysis"],
    "defense_sim": ["hypersonic glide vehicle computational fluid dynamics", "electronic counter-countermeasure signal processing", "autonomous drone swarm decentralized consensus protocol", "satellite constellation radiation-hardening telemetry"],
    "banking_ledger": ["SWIFT international wire transfer fraud anomaly audit", "central bank digital currency cross-border settlement log", "tier-1 investment bank dark pool trade execution records", "anti-money laundering high-risk transaction graph analysis"],
    "gpu_batch": ["indexing 50 million internal enterprise confluence pages", "generating dense vector index for legal precedent database", "unsupervised clustering on 100M customer search queries"],
    "telemetry_data": ["Mach 5 atmospheric re-entry thermal sensor logs", "turbofan engine vibration spectrum acoustic telemetry", "attitude determination and control system gyro drift data"],
    "private_repo": ["proprietary high-frequency trading algorithmic core in C++", "internal cryptographic key management hardware security module driver", "closed-source compiler optimization pass for specialized tensor silicon"],
    "hr_report": ["executive compensation committee confidential deliberations", "internal investigation into executive misconduct allegations", "confidential workforce reorganization and severance modeling"],
    "biomed_data": ["virtual ligand screening against SARS-CoV-2 main protease", "deep learning protein-protein docking interaction simulation", "cancer neoantigen binding affinity prediction on 8x A100"],
    "crypto_audit": ["FIPS 140-3 Level 4 hardware security module zeroization verification", "post-quantum cryptography lattice key exchange protocol audit", "secure enclave remote attestation measurement report"],
    "loan_data": ["commercial real estate $50B debt restructuring risk profile", "multinational corporate syndicated loan default probability matrix", "subprime consumer auto loan delinquency hazard rate model"],
    "wiki_data": ["internal engineering runbooks for disaster recovery", "confidential employee patent disclosure repository", "proprietary manufacturing process recipe and yield optimization guide"],
    "code_task": [
        "calculates Fibonacci numbers iteratively", "parses CSV with error handling",
        "implements a binary search tree", "validates email addresses with regex",
        "handles concurrent requests with asyncio", "compresses files using gzip",
        "connects to a PostgreSQL database", "implements rate limiting middleware",
        "serializes nested objects to JSON", "manages a thread pool",
    ],
    "code_snippet": [
        "a recursive function with a stack overflow", "an async generator that leaks memory",
        "a Flask route with SQL injection vulnerability", "a React hook with infinite re-renders",
        "a Pandas operation chaining causing SettingWithCopyWarning",
    ],
    "output_format": ["JSON", "YAML", "XML", "Protobuf", "GraphQL"],
    "domain": ["e-commerce", "healthcare", "fintech", "education", "logistics", "social media"],
    "algorithm": ["quicksort", "Dijkstra's algorithm", "dynamic programming knapsack", "BFS vs DFS", "merge sort"],
    "diff_desc": ["add user authentication middleware", "refactor database connection pooling", "migrate from REST to GraphQL"],
    "component": ["authentication service", "payment processor", "notification engine", "search indexer", "cache layer"],
    "pattern": ["strategy pattern", "observer pattern", "factory method", "dependency injection", "decorator pattern"],
    "sql_task": ["find the top 10 customers by revenue", "detect duplicate entries across tables", "calculate running totals"],
    "api_task": ["user registration with email verification", "file upload with progress tracking", "paginated search results"],
    "language": ["Python", "TypeScript", "Rust", "Go", "Java", "C#"],
    "algo_problem": ["find the longest palindromic substring", "implement LRU cache", "detect cycle in a linked list"],
    "code_context": ["a microservices payment gateway", "a real-time chat application", "a data pipeline scheduler"],
    "deploy_target": ["AWS ECS", "Kubernetes", "Google Cloud Run", "Azure Functions"],
    "query_desc": ["a 5-table JOIN with subqueries", "aggregation over partitioned time-series data"],
    "json_desc": ["a nested API response with pagination", "a user profile with addresses and preferences"],
    "ui_task": ["renders a sortable data table with pagination", "implements drag-and-drop file upload"],
    "devops_task": ["database backup and rotation", "log aggregation and alerting", "container image scanning"],
    "concept_a": ["threads", "REST", "SQL", "monolith", "OOP"],
    "concept_b": ["coroutines", "GraphQL", "NoSQL", "microservices", "FP"],
    "tech_domain": ["web development", "distributed systems", "machine learning", "cloud architecture"],
    "system_desc": ["a real-time multiplayer game backend", "a high-throughput event streaming platform"],
    "class_desc": ["UserAuthenticationService", "PaymentProcessor", "DataPipelineOrchestrator"],
    "doc_desc": ["a 50-page terms of service agreement", "an employment contract with non-compete clauses"],
    "content_desc": ["a social media post about a political figure", "a product review that may contain hate speech"],
    "page_count": ["30", "50", "100", "200"],
    "paper_topic": ["large language model alignment", "climate change mitigation strategies", "quantum error correction"],
    "complaint": ["a billing dispute involving a vulnerable customer", "an accessibility failure affecting disabled users"],
    "scenario": ["using AI for hiring decisions", "automated content moderation in schools"],
    "controversial_topic": ["AI regulation approaches", "remote work policies", "data privacy vs security"],
    "policy_desc": ["parental leave policy", "remote work guidelines", "performance review process"],
    "thread_desc": ["a 200-message Slack channel about product roadmap", "a week-long email thread about budget allocation"],
    "debate_topic": ["open-source vs proprietary AI models", "strict vs permissive software licensing"],
    "rejection_context": ["a job applicant after final interview", "a vendor proposal that didn't meet requirements"],
    "ai_system": ["autonomous customer service agents", "AI-powered medical triage"],
    "doc_type": ["privacy policy", "financial disclosure", "clinical trial protocol"],
    "complex_situation": ["a merger between two competing AI startups", "a data breach at a healthcare provider"],
    "dilemma": ["reporting a colleague's minor policy violation", "balancing speed-to-market with thorough testing"],
    "length": ["50-page", "100-page", "long"],
    "topic": ["AI governance", "supply chain disruption", "cybersecurity trends"],
    "crisis_scenario": ["a data breach affecting 1M users", "a product recall due to safety concerns"],
    "org_context": ["a 500-person tech company", "a global consulting firm"],
    "platform_type": ["a children's educational platform", "a professional networking site"],
    "image_desc": ["a product photo from multiple angles", "a whiteboard with handwritten notes"],
    "source_lang": ["English", "Spanish", "Japanese", "German", "French", "Mandarin", "Arabic", "Korean"],
    "target_lang": ["English", "Spanish", "Japanese", "German", "French", "Portuguese", "Italian"],
    "text_sample": ["a technical blog post about Kubernetes", "a restaurant menu", "a news headline"],
    "video_topic": ["a 2-hour conference keynote", "a product demo walkthrough"],
    "design_type": ["mobile app", "landing page", "dashboard", "email template"],
    "market": ["Japan", "Brazil", "Germany", "Saudi Arabia"],
    "ticket_desc": ["password reset not working", "billing charge disputed", "feature request for dark mode"],
    "user_message": ["I want to cancel my subscription", "How do I export my data?", "The app keeps crashing"],
    "message": ["Congratulations! You've won a $1000 gift card!", "Meeting rescheduled to 3pm tomorrow"],
    "review_text": ["The product arrived damaged but support was helpful", "Best purchase I've made this year"],
    "chat_message": ["Thanks for the help!", "Can you check my order status?", "I'm having trouble logging in"],
    "format": ["XML", "CSV", "YAML", "TOML"],
    "data_sample": ["a product catalog entry", "a server log line", "a weather API response"],
    "partial_sentence": ["The main advantage of using microservices is", "To implement OAuth 2.0 you need to"],
    "factual_question": ["What is the capital of Australia?", "When was Python 3 released?"],
    "category_options": ["urgent, normal, low priority", "billing, technical, general"],
    "article_snippet": ["a 500-word article about renewable energy", "a breaking news story about AI regulation"],
    "doc_preview": ["a technical whitepaper on blockchain scalability", "a quarterly earnings report"],
    "query": ["I need to return a defective product", "I want to upgrade my subscription plan"],
    "paragraph": ["a detailed explanation of how transformers work", "a project status update email"],
    "input_string": ["an ISO 8601 date", "a credit card number", "an IPv6 address"],
    "alert_desc": ["server CPU at 95% for 10 minutes", "3 failed login attempts from unknown IP"],
    "report_desc": ["Q4 earnings with projections", "annual risk assessment"],
    "health_desc": ["patient vitals and medication history", "radiology findings for review"],
    "dataset_desc": ["10M rows of proprietary transaction data", "internal customer behaviour logs"],
    "doc_batch": ["2000 internal memos from the legal department", "500 engineering design documents"],
    "count": ["1000", "5000", "10000", "50000"],
    "kb_desc": ["internal engineering wiki with 5000 pages", "company policy knowledge base"],
    "gov_doc": ["a classified infrastructure assessment", "a restricted procurement specification"],
}


def _fill_template(template: str, rng: random.Random) -> str:
    """Replace {slot} placeholders with random fillers."""
    import re
    def _replacer(match: re.Match) -> str:
        key = match.group(1)
        options = SLOT_FILLERS.get(key)
        return rng.choice(options) if options else match.group(0)
    return re.sub(r"\{(\w+)\}", _replacer, template)


def _generate_samples(provider: str, count: int, rng: random.Random) -> list[dict[str, str]]:
    """Generate `count` unique prompt-provider pairs for one provider."""
    templates = PROVIDER_TEMPLATES[provider]
    samples: list[dict[str, str]] = []
    seen: set[str] = set()
    attempts = 0
    max_attempts = count * 25
    while len(samples) < count and attempts < max_attempts:
        attempts += 1
        template = rng.choice(templates)
        prompt = _fill_template(template, rng)
        if prompt not in seen:
            seen.add(prompt)
            samples.append({"prompt": prompt, "providerlabel": provider})
    return samples


def _split_train_test(
    samples: list[dict[str, str]], test_fraction: int = 5,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Deterministic hash-based train/test split."""
    train, test = [], []
    for sample in samples:
        digest = hashlib.sha256(sample["prompt"].encode("utf-8")).digest()[0]
        if digest % test_fraction == 0:
            test.append(sample)
        else:
            train.append(sample)
    return train, test


def _write_jsonl(path: Path, records: list[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return len(records)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate seed provider-routing data for the PrismSpace provider router.",
    )
    parser.add_argument("--output-dir", default="model/datasets/training/curated/provider",
                        help="Output directory for train.jsonl and test.jsonl")
    parser.add_argument("--samples-per-provider", type=int, default=200,
                        help="Number of samples to generate per provider (default: 200)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print counts without writing files")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    output = Path(args.output_dir)
    providers = sorted(PROVIDER_TEMPLATES.keys())

    all_samples: list[dict[str, str]] = []
    for provider in providers:
        samples = _generate_samples(provider, args.samples_per_provider, rng)
        all_samples.extend(samples)

    rng.shuffle(all_samples)
    train, test = _split_train_test(all_samples)

    # Report
    from collections import Counter
    train_counts = Counter(s["providerlabel"] for s in train)
    test_counts = Counter(s["providerlabel"] for s in test)

    print(f"\nProvider Seed Dataset Generator")
    print(f"{'─' * 50}")
    print(f"  Samples per provider: {args.samples_per_provider}")
    print(f"  Total providers:      {len(providers)}")
    print(f"  Total samples:        {len(all_samples)}")
    print(f"  Train split:          {len(train)}")
    print(f"  Test split:           {len(test)}")
    print(f"\n  {'Provider':<12}  {'Train':>6}  {'Test':>6}")
    print(f"  {'─' * 12}  {'─' * 6}  {'─' * 6}")
    for provider in providers:
        print(f"  {provider:<12}  {train_counts[provider]:>6}  {test_counts[provider]:>6}")

    if args.dry_run:
        print(f"\n  [DRY RUN] No files written.")
        return

    train_count = _write_jsonl(output / "train.jsonl", train)
    test_count = _write_jsonl(output / "test.jsonl", test)
    print(f"\n  Written:")
    print(f"    {output / 'train.jsonl'} ({train_count} rows)")
    print(f"    {output / 'test.jsonl'} ({test_count} rows)")
    print(f"\n  Next steps:")
    print(f"    1. python -m model.train --dataset-dir model\\datasets --curated-dir model\\datasets\\curated --output-dir model\\artifacts")
    print(f"    2. python -m model.evaluate_models")


if __name__ == "__main__":
    main()
