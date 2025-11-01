# Avatar-Based Chat Interface Implementation

## Overview

Replaced traditional chat windows with avatar-based interface featuring:
- Agent face image (300x300px)
- Speech bubble with latest message
- Text input field
- No message history (single message display)

## Directory Structure

```
web/agent_avatars/
├── tutor/
│   ├── base.svg          # Main tutor (young female teacher)
│   └── pirate.svg        # Pirate-themed version
└── activity/
    ├── 01_base.svg       # Activity helper 1
    ├── 01_pirate.svg
    ├── 02_base.svg       # Activity helper 2
    ├── 02_pirate.svg
    ... (01-10, 20 files total)
    └── 10_pirate.svg
```

## AI Image Generation Prompts

### Main Tutor - Base Version
```
Create a friendly cartoon avatar of a young female teacher (25-30 years old) for a children's learning app. Style: warm, approachable, professional. Head and shoulders portrait, 300x300px. Large expressive eyes, warm smile. Medium-length hair, smart casual attire (collared shirt). Vibrant but not overwhelming colors (blues, greens, earth tones). Transparent or light gray background. Child-friendly illustration style suitable for grades 2-4.
```

### Main Tutor - Pirate Version
```
Same character as previous, but with kid-friendly pirate theme. Add: classic tricorn pirate hat (no skull), warm smile maintained. Optional: compass necklace, rope details on clothing. Colors: add reds, blacks, golds. Keep professional and friendly appearance. No weapons, no scary elements. Suitable for elementary school children.
```

### Activity Helper Avatars

**Character 1: Young Female, East Asian**
- Base: `Friendly cartoon avatar, young Asian female teacher (20s), glasses, casual professional attire, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate bandana, vest over shirt, friendly expression, no weapons`

**Character 2: Middle-aged Male, Black**
- Base: `Friendly cartoon avatar, middle-aged Black male teacher (40s), button-up shirt, short beard, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with tricorn pirate hat, eye patch, friendly expression, no weapons`

**Character 3: Young Female, Hispanic**
- Base: `Friendly cartoon avatar, young Hispanic female teacher (20s), colorful blouse, long hair, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate coat, hair in braid, friendly expression, no weapons`

**Character 4: Older Male, South Asian**
- Base: `Friendly cartoon avatar, older South Asian male teacher (60s), cardigan, gray temple hair, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with captain's coat, small telescope prop, friendly expression, no weapons`

**Character 5: Young Male, White**
- Base: `Friendly cartoon avatar, young White male teacher (20s), casual shirt, friendly expression, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate bandana, small earring, friendly expression, no weapons`

**Character 6: Middle-aged Female, Black**
- Base: `Friendly cartoon avatar, middle-aged Black female teacher (40s), professional attire, natural hair, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate headscarf, compass necklace, friendly expression, no weapons`

**Character 7: Older Female, East Asian**
- Base: `Friendly cartoon avatar, older East Asian female teacher (60s), glasses, kind expression, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with small tricorn hat, map in background, friendly expression, no weapons`

**Character 8: Young Male, Middle Eastern**
- Base: `Friendly cartoon avatar, young Middle Eastern male teacher (20s), polo shirt, short hair, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate vest, rope details, friendly expression, no weapons`

**Character 9: Middle-aged Female, White**
- Base: `Friendly cartoon avatar, middle-aged White female teacher (40s), sweater, shoulder-length hair, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate hat, feather accent, friendly expression, no weapons`

**Character 10: Young Male, Hispanic**
- Base: `Friendly cartoon avatar, young Hispanic male teacher (20s), t-shirt, casual style, warm smile, head and shoulders, 300x300px, child-friendly style`
- Pirate: `Same character with pirate bandana, casual vest, friendly expression, no weapons`

## Technical Specifications

### Image Requirements
- **Dimensions:** 300x300px (square)
- **Format:** PNG with transparency (or SVG)
- **File size:** < 100KB per image
- **Background:** Transparent or solid #f0f0f0
- **Style:** Cartoon/illustration, not photo-realistic
- **Expression:** Friendly, warm, encouraging

### Kid-Friendly Pirate Elements ✓
- Tricorn hats (no skull and crossbones)
- Bandanas and headscarves
- Eye patches (friendly looking)
- Pirate coats/vests
- Compass, telescope, map props
- Rope, anchor motifs
- Gold coins, treasure elements

### Avoid ✗
- Weapons (swords, guns, knives)
- Scary skull imagery
- Dark/threatening expressions
- Alcohol references
- Violence imagery

## CSS Classes

### Main Tutor Chat Widget
```css
.avatar-chat-widget {
  display: flex;
  flex-direction: column;
  width: 350px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  margin: 20px auto;
}

.speech-bubble {
  background: #f0f0f0;
  border-radius: 20px;
  padding: 15px 20px;
  margin: 0 20px 20px;
  position: relative;
  min-height: 60px;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #f0f0f0;
}
```

### Activity Chat Widget
Similar structure but with random agent selection from 10 avatars.

## JavaScript Implementation

### ChatWidget.js Changes
```javascript
// Replace message history with single message display
this.currentMessage = '';
this.avatarImage = null;

// Load tutor avatar
loadAvatar() {
  const theme = this.getCurrentTheme(); // 'base' or 'pirate'
  this.avatarImage.src = `agent_avatars/tutor/${theme}.svg`;
}

// Update speech bubble
updateMessage(message) {
  this.currentMessage = message;
  this.speechBubble.textContent = message;
}
```

### ActivityChatWidget.js Changes
```javascript
// Random agent selection
selectRandomAgent() {
  const agentId = Math.floor(Math.random() * 10) + 1;
  const theme = this.getCurrentTheme();
  const paddedId = String(agentId).padStart(2, '0');
  return `agent_avatars/activity/${paddedId}_${theme}.svg`;
}
```

## Placeholder SVG Avatars

Until AI-generated images are ready, SVG placeholders are provided with:
- Geometric shapes for faces
- Color-coded diversity
- Pirate accessories overlaid
- Fully scalable
- ~5KB file size each

## Generating Images with AI

### Using DALL-E 3 (Recommended)
1. Use ChatGPT Plus or API
2. Copy prompts from above
3. Request 300x300px square format
4. Download and save to appropriate directory

### Using Midjourney
1. Add prompts to Midjourney
2. Add `--ar 1:1 --s 300` for square format
3. Upscale and download
4. Crop to 300x300px if needed

### Using Stable Diffusion
1. Use prompts with SD 1.5 or SDXL
2. Set resolution to 512x512 or 1024x1024
3. Downscale to 300x300px
4. Use ControlNet for consistency

## Testing

1. Place avatar images in directories
2. Open web/index.html
3. Click chat button
4. Verify avatar displays
5. Send message, verify speech bubble updates
6. Start activity, verify random agent selection

## Future Enhancements

1. **Animated Expressions**
   - Happy, thinking, encouraging faces
   - Swap images based on context

2. **Voice Synthesis**
   - Text-to-speech for messages
   - Match voice to avatar

3. **Gesture Animations**
   - Subtle head nods
   - Hand gestures in speech bubble

4. **Customization**
   - Let students choose their tutor
   - Unlock special avatars

5. **Accessibility**
   - Alt text for all avatars
   - High contrast mode
   - Screen reader support
