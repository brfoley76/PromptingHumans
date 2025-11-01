# Token Management Implementation

## Problem
API requests were failing with error:
```
"prompt is too long: 211177 tokens > 200000 maximum"
```

The issue was caused by:
1. Loading entire curriculum including large narrative section (~54 segments)
2. Unbounded conversation history growth
3. No token counting or management

## Solution Overview

Implemented comprehensive token management system with:
- **Token counting and monitoring**
- **Lightweight curriculum loading** (excludes narrative)
- **Rolling conversation summaries** for TutorAgent
- **Simple truncation** for ActivityAgent
- **Automatic token limit enforcement**

## Implementation Details

### 1. Token Counter Service (`services/token_counter.py`)

New utility for counting and managing tokens:

```python
class TokenCounter:
    MAX_TOKENS_WARNING = 150000    # Log warning
    MAX_TOKENS_LIMIT = 180000      # Aggressive truncation
    MAX_TOKENS_HARD_LIMIT = 190000 # Reject request
```

Features:
- Accurate token counting using `tiktoken`
- Token limit checking with status levels (ok/warning/critical/error)
- Message truncation while preserving system context
- Singleton pattern for efficiency

### 2. Lightweight Curriculum Loading (`services/curriculum.py`)

Added methods to reduce curriculum token usage:

**`load_curriculum_light(module_id)`**
- Excludes narrative section (saves ~10K+ tokens)
- Keeps vocabulary, problems, metadata
- Used by both TutorAgent and ActivityAgent

**`get_activity_vocabulary(module_id, activity_type, difficulty)`**
- Filters vocabulary by difficulty level
- Includes high-importance words regardless of difficulty
- Further reduces context for ActivityAgent

### 3. TutorAgent - Rolling Summary (`agents/llm_agent.py`)

**Strategy**: Maintain conversation context while controlling token growth

**Implementation**:
```python
# After 20 messages (configurable)
if message_count >= TUTOR_SUMMARY_THRESHOLD:
    # Generate summary of older messages
    conversation_summary = _summarize_conversation()
    
    # Keep only recent 10 messages
    conversation_history = conversation_history[-10:]
```

**Context Structure**:
```
System Context (static, ~2K tokens)
├── Module info
├── Sample vocabulary (first 15 words)
└── Teaching guidelines

Session Memory (dynamic)
├── Summary of older conversation (~500 tokens)
└── Recent messages (last 10, ~3K tokens)

Total: ~6K tokens (vs 200K+ before)
```

### 4. ActivityAgent - Simple Truncation

**Strategy**: Short-lived agents don't need summaries

**Implementation**:
```python
# Keep only last 10 messages
message_limit = ACTIVITY_MESSAGE_LIMIT
recent_messages = conversation_history[-message_limit:]
```

**Why it works**:
- Activities are ephemeral (created/destroyed per activity)
- Shorter interactions don't accumulate history
- Vocabulary filtered by difficulty reduces initial context

### 5. Configuration (`config.py`)

Added configurable limits:

```python
# Token Management
MAX_TOKENS_WARNING = 150000
MAX_TOKENS_LIMIT = 180000
MAX_TOKENS_HARD_LIMIT = 190000

# Conversation History
TUTOR_SUMMARY_THRESHOLD = 20  # Messages before summary
TUTOR_RECENT_MESSAGES = 10    # Recent messages to keep
ACTIVITY_MESSAGE_LIMIT = 10   # Activity message limit
```

### 6. Token Safety Checks

Every LLM call now includes:

```python
# Check token count
token_check = token_counter.check_token_limit(messages)

if token_check['status'] == 'error':
    # Emergency truncation
    messages = truncate_messages(messages, MAX_TOKENS_LIMIT)
elif token_check['status'] == 'critical':
    logger.warning(token_check['message'])
elif token_check['status'] == 'warning':
    logger.info(token_check['message'])
```

## Token Budget Breakdown

### Before (Failing)
```
System Context: ~15K tokens (with full vocabulary)
Narrative: ~10K tokens (unused but loaded)
Conversation History: Unbounded (grew to 180K+)
Total: 211K+ tokens ❌
```

### After (Fixed)
```
TutorAgent:
├── System Context: ~2K tokens (sample vocabulary)
├── Summary: ~500 tokens (compressed older messages)
├── Recent History: ~3K tokens (last 10 messages)
└── Total: ~6K tokens ✅

ActivityAgent:
├── System Context: ~1.5K tokens (filtered vocabulary)
├── Recent History: ~2K tokens (last 10 messages)
└── Total: ~4K tokens ✅
```

## Agent Separation

**TutorAgent** (Persistent, General Guidance)
- Loads lightweight curriculum (no narrative)
- Uses rolling summary for long conversations
- Maintains context across entire session

**ActivityAgent** (Ephemeral, Activity-Specific)
- Loads filtered vocabulary by difficulty
- Uses simple truncation (no summary needed)
- Created/destroyed per activity

## Testing

Created comprehensive test suite (`tests/test_token_management.py`):

- ✅ Token counting accuracy
- ✅ Lightweight curriculum loading
- ✅ Vocabulary filtering by difficulty
- ✅ TutorAgent rolling summary
- ✅ ActivityAgent truncation
- ✅ Long conversation handling
- ✅ Token limit enforcement

## Installation

Added dependency:
```bash
pip install tiktoken==0.5.2
```

## Usage

No changes required to existing code! The token management is automatic:

```python
# TutorAgent automatically uses rolling summary
tutor = TutorAgent("Student", "r003.1")
tutor._call_llm("Hello!")  # Token management happens automatically

# ActivityAgent automatically filters vocabulary
activity = ActivityAgent("Student", "r003.1", "multiple_choice", "3")
activity._call_llm("Help me!")  # Truncation happens automatically
```

## Monitoring

Token usage is logged at INFO level:

```
INFO: Token usage: 5234 tokens (ok)
INFO: Token usage: 152000 tokens (warning)
WARNING: Approaching token limit: 182000 tokens
ERROR: Token limit exceeded: 195000 tokens
```

## Benefits

1. **Prevents API failures** - No more 200K token limit errors
2. **Maintains context** - Rolling summary preserves important information
3. **Efficient** - Reduces token usage by ~97% (211K → 6K)
4. **Scalable** - Can handle arbitrarily long conversations
5. **Automatic** - No manual intervention required
6. **Monitored** - Token usage logged for debugging

## Future Enhancements

Possible improvements:
- Adaptive summary frequency based on token usage
- Semantic compression of summaries
- User-specific token budgets
- Token usage analytics dashboard
