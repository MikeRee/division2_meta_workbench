# Division 2 Meta Workbench

An advanced build calculator and meta analysis tool for **The Division 2** (PS5), powered by AI assistance. This workbench allows you to create, analyze, and optimize character builds while leveraging an integrated LLM chat interface for personalized gear recommendations based on your play style and current game conditions.

## 🎯 Overview

Division 2 Meta Workbench is a comprehensive tool designed for Division 2 players who want to:
- **Create and manage detailed character builds** with full control over weapons, gear, skills, and specializations
- **Get AI-powered recommendations** for optimal gear choices based on your play style and current seasonal conditions
- **Customize calculation formulas** using a visual Blockly editor or direct JSON editing
- **Explore and modify the game's underlying data** through the integrated DivisionDB viewer

## 🌟 Key Features

### 1. Build Calculator
Create and manage complete character builds with all Division 2 components:

- **Weapons**: Primary, secondary, and pistol slots with detailed mod customization (optics, magazine, muzzle, underbarrel)
- **Gear**: All six armor pieces (mask, chest, holster, backpack, gloves, kneepads) with core attributes, minor attributes, and gear mods
- **Skills**: Two skill slots for your chosen abilities
- **Specializations**: Six classes (Demolitionist, Firewall, Gunner, Sharpshooter, Survivalist, Technician) with unique bonuses and stacking mechanics
- **Keener's Watch**: 16 customizable stats across four categories (Offensive, Defensive, Utility, Handling)

### 2. AI Chat Assistant
Ask questions about gear recommendations through an integrated chat interface powered by OpenRouter/Gemini:

- **Play Style Analysis**: Get personalized suggestions based on your preferred combat approach
- **Seasonal Conditions**: Ask about optimal choices for current seasonal modifiers and game states
- **Existing Build Feedback**: Get analysis and improvement suggestions for builds you've created
- **Context-Aware Recommendations**: The AI considers your current build, game data, and seasonal modifiers when providing advice

**Configuration**: Set up your OpenRouter API key in the chat settings to enable LLM features.

### 3. Custom Formula Builder (Blockly)
Create custom stat calculations using a visual Blockly editor:

- **Visual Programming**: Drag and drop blocks to build complex formulas without coding
- **Pre-built Blocks**: Access to comprehensive block library including:
  - Data retrieval from weapons, gear, brand sets, and Keener's Watch
  - Sum/percent calculations across entire build
  - Math operations (add, subtract, multiply, divide)
  - Conditional logic with if-then-else statements
  - Compound percentage calculations for Division 2's damage formula
- **Formula Types**: Support for numeric values, percentages, and per-second rates
- **JSON Export/Import**: View and edit formulas in raw JSON format

### 4. DivisionDB Data Editor
View and modify the game's underlying data:

- **Raw JSON Viewer**: Browse all game data including weapons, gear sets, brand sets, talents, skills, and specializations
- **Bulk Editing**: Modify values across multiple entries simultaneously
- **Custom Modifiers**: Add your own modifiers to customize calculations
- **Live Updates**: Changes apply immediately to build calculations
- **Data Freshness Monitor**: Receive notifications when updates are available

### 5. Advanced Calculation Engine
Comprehensive stat calculation supporting all Division 2 mechanics:

- **Brand Set Bonuses**: Automatic application of 1pc, 2pc, and 3pc bonuses (with NinjaBike support)
- **Gear Set Bonuses**: 2-piece and 4-piece set bonus calculations
- **Talent Stacks**: Multi-level stacking talents from gear, weapons, and specializations
- **Compound Percentages**: Proper handling of Division 2's multiplicative damage formula
- **Named Exotics**: Special handling for named exotic gear with brand associations

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (persistent stores)
- **Visual Programming**: Blockly
- **UI Components**: Custom CSS with React Icons

### Data Flow
```
Google Sheets/CSV → Data Normalization → Clean Store → Calculation Engine → UI Display
                                    ↓
                               Raw Store → DivisionDB Editor
                                    ↓
                              LocalStorage Persistence
```

### Key Stores
- **BuildStore**: Manages active builds and build selection
- **CleanDataStore**: Processed game data used for calculations
- **LookupStore**: Lookup tables for attributes and classifications
- **RawDataStore**: Raw JSON data from external sources
- **FormulaStore**: Custom formula definitions and Blockly configurations
- **RulesStore**: Game rules and constraints
- **CleanDataStore**: Normalized attribute data

## 📊 Supported Game Elements

### Weapon Properties
- RPM, Magazine Size, Reload Speed, Damage, Optimal Range, HSD (Headshot Damage)
- Core attributes: Weapon-type damage + secondary stat
- Minor attributes: Customizable secondary stats
- Mod slots: Optics, magazine, muzzle, underbarrel with individual bonuses

### Gear Properties
- **Core Attributes**: Weapon damage (%), Armor (base value), Skill tier
- **Minor Attributes**: Offensive, defensive, and skill-based stats
- **Gear Mods**: Additional mod slots on mask/chest/backpack
- **Sources**: Brand sets, gear sets, named exotics with talent associations

### Specializations
All six classes with unique mechanics:
- **Demolitionist**: Explosive damage stacking
- **Firewall**: Skill damage and duration bonuses
- **Gunner**: Weapon handling and reload speed
- **Sharpshooter**: Critical hit and optimal range focus
- **Survivalist**: Health and armor regeneration
- **Technician**: Drone support and skill repair

### Keener's Watch Stats
16 stats across four categories:
- **Offensive**: Weapon damage, crit chance/damage, headshot damage
- **Defensive**: Armor, health, explosive resistance, hazard protection
- **Utility**: Skill haste, duration, damage, repair
- **Handling**: Accuracy, stability, reload speed, ammo capacity

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Normalize Data
```bash
npm run normalize
```

## 📚 Documentation

See the [Blockly Formula Generation](./docs/blockly-formula-prompt.md) guide for detailed information on creating custom formulas using the Blockly editor.

## 🔧 Configuration

### OpenRouter API Setup
1. Click the chat icon in the title bar
2. Click "Configuration"
3. Enter your OpenRouter API key
4. Save and start asking about gear recommendations!

### Custom Prompts
Edit prompts in `public/clean/prompts.json` to customize AI behavior:
- **System**: Core instructions for the AI
- **Query**: Default query template
- **Seasonal**: Seasonal modifier context
- **Existing**: Existing build analysis template

## 🎮 Use Cases

### For Casual Players
Use the chat assistant to get personalized gear recommendations based on your play style without needing to understand complex calculations.

### For Theory-Crafters
Leverage the custom formula builder and DivisionDB editor to test hypotheses, create optimized builds for specific content, and add custom modifiers.

### For Content Creators
Save and share build configurations, analyze meta trends, and generate data-driven recommendations for your audience.

## 🛡️ PS5 Focus

This tool is primarily designed with PS5 players in mind:
- UI optimized for console-like interaction patterns
- Consideration of controller input preferences
- Alignment with PS5-specific game mechanics and limitations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **The Division 2** by Ubisoft
- **OpenRouter** for AI model access
- **Blockly** by Google for visual programming
- **Division 2 community** for game knowledge and testing feedback

---

*Built with ❤️ for the Division 2 community*
