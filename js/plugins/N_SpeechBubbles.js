/* 
 * MIT License
 * 
 * Copyright (c) 2020 Nolonar
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//=============================================================================
// N_SpeechBubbles
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Displays text in speech bubbles above event.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins-SpeechBubbles
 * 
 * @param Distance
 * @desc How far the player can be before the speech bubble is no longer visible.
 * @type number
 * @min 1
 * @max 10
 * @default 2
 * 
 * 
 * @command show
 * @text Show bubble
 * @desc Shows a speech bubble.
 * 
 * @arg text
 * @text Text
 * @desc Text to display in the speech bubble.
 * @type multiline_string
 * 
 * @arg target
 * @text Target
 * @desc Where the speech bubble will be displayed. Choose predefined options, or enter a number for the event ID.
 * @type combo
 * @option This event
 * @option Player
 * @option Event by variable
 * @default This event
 * 
 * @arg targetVarId
 * @parent target
 * @text Target ID Variable
 * @desc If you chose "Event by variable" as target, select the Variable that contains the ID of the event to target.
 * @type variable
 * @default 1
 * 
 * @arg durationMs
 * @text Duration (milliseconds)
 * @desc How long the bubble will be visible. If 0, the bubble will last for 150 ms per visible character.
 * @type number
 * @default 0
 * 
 * @arg isBlocking
 * @text Wait for completion
 * @desc ON: the event will wait until the bubble is gone.
 *       OFF: the event will continue without waiting.
 * @type boolean
 * @default true
 * 
 * 
 * @command script
 * @text Execute Script
 * @desc Execute a script.
 * 
 * @arg script
 * @text Script
 * @desc The script to execute.
 * @type multiline_string
 * 
 * 
 * @help Version 1.0.1
 * 
 * Speech bubbles support the following control characters:
 *      \v[n]   Replaced by the value of the nth variable.
 *      \n[n]   Replaced by the name of the nth actor.
 *      \p[n]   Replaced by the name of the nth party member.
 *      \g      Replaced by the currency unit.
 *      \c[n]   Draw the subsequent text in the nth color.
 *      \i[n]   Draw the nth icon.
 *      \{      Increase the text size by one step.
 *      \}      Decrease the text size by one step.
 *      \\      Replaced with the backslash character.
 * 
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 * 
 * Execute script
 *      For experts only.
 * 
 *      Similar to the "Script..." event command, but gives you access to the
 *      various N_SpeechBubbles functions. This allows you to have more control
 *      over speech bubbles than is currently supported by this plugin.
 * 
 *      Refer to the plugin
 * 
 * ============================================================================
 * Notetags
 * ============================================================================
 * Event Notetag:
 *      <bubble:[text]>
 *      Displays [text] in a speech bubble above the event. The speech bubble
 *      is only visible while the player character is within distance.
 * 
 * Example:
 *      <bubble:Fine weather today!>
 * 
 *          Fine weather today!
 * 
 * To display text over multiple lines, use the \n control character to add a
 * new line.
 * 
 * Example:
 *      <bubble:Hello\nWorld>
 * 
 *          Hello
 *          World
 */

(() => {
    const PLUGIN_NAME = "N_SpeechBubbles";

    //=========================================================================
    // Constants
    //=========================================================================
    const NOTETAG_BUBBLE = "bubble";

    const COMMAND_SHOW = "show";
    const COMMAND_ARG_TARGET_SELF = "This event";
    const COMMAND_ARG_TARGET_PLAYER = "Player";
    const COMMAND_ARG_TARGET_BYVAR = "Event by variable";

    const COMMAND_SCRIPT = "script";

    const WAITMODE_BUBBLE = "bubble";

    let parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.Distance = Number(parameters.Distance) || 2;

    let currentInterpreter = null;
    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_SHOW, function (args) {
        currentInterpreter = this;

        const text = args.text;
        const target = {
            [COMMAND_ARG_TARGET_SELF]: getCurrentEvent(),
            [COMMAND_ARG_TARGET_PLAYER]: getPlayer(),
            [COMMAND_ARG_TARGET_BYVAR]: getEventByVar(args.targetVarId)
        }[args.target] || getEventById(args.target);
        const duration = Number(args.durationMs);
        const isBlocking = args.isBlocking.toLowerCase() === "true";

        showBubble(text, target, duration, isBlocking);
    });
    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_SCRIPT, function (args) {
        currentInterpreter = this;
        eval(args.script);
    });

    let isSpeechBubbleActive = false; // For blocking speech bubbles.
    function showBubble(text, target, duration, isBlocking) {
        let scene = SceneManager._scene;

        let speechBubble = new Window_Bubble(target, text);
        speechBubble.addTo(scene);

        setTimeout(() => {
            if (isBlocking)
                isSpeechBubbleActive = false;

            scene.removeChild(speechBubble);
        }, duration || speechBubble.textLength * 150);

        if (isBlocking) {
            currentInterpreter.setWaitMode(WAITMODE_BUBBLE);
            isSpeechBubbleActive = true;
        }
    }

    function getPlayer() {
        return $gamePlayer;
    }

    function getCurrentEvent() {
        return $gameMap._events[currentInterpreter.eventId()];
    }

    function getEventById(id) {
        return $gameMap._events[id];
    }

    function getEventByVar(v) {
        return getEventById($gameVariables.value(v));
    }

    //=========================================================================
    // Window_Bubble
    //=========================================================================
    class Window_Bubble extends Window_Base {
        initialize(targetCharacter, text) {
            super.initialize(new Rectangle(0, 0, 0, 0));

            this.targetCharacter = targetCharacter;
            this.text = text;
            let textDimensions = this.textSizeEx(this.text);
            this.textLength = textDimensions.length;
            let width = textDimensions.width + $gameSystem.windowPadding() * 2;
            let height = textDimensions.height + $gameSystem.windowPadding() * 2;

            this.move(0, 0, width, height);
            this.createContents();
            this.drawTextEx(this.text, 0, 0);
        }

        flushTextState(textState) {
            textState.length += textState.buffer.length - (textState.rtl ? 1 : 0);
            super.flushTextState(textState);
        }

        textSizeEx(text) {
            this.resetFontSettings();
            const textState = this.createTextState(text, 0, 0, 0);
            textState.drawing = false;
            textState.length = 0;
            this.processAllText(textState);
            return {
                width: textState.outputWidth,
                height: textState.outputHeight,
                length: textState.length
            };
        }

        getCharacterSprite() {
            return SceneManager._scene._spriteset._characterSprites
                .find(sprite => sprite._character === this.targetCharacter);
        }

        getTargetPosition() {
            let sprite = this.getCharacterSprite();
            return {
                x: sprite.x - this.width / 2,
                y: sprite.y - sprite.height - this.height - 10
            };
        }

        update() {
            let windowPosition = this.getTargetPosition();
            this.x = windowPosition.x;
            this.y = windowPosition.y;
            super.update();
        }

        shouldBeVisible() {
            let distance = parameters.Distance;
            let xDist = $gamePlayer._realX - this.targetCharacter.x;
            let yDist = $gamePlayer._realY - this.targetCharacter.y;
            return xDist * xDist + yDist * yDist <= distance * distance;
        }

        addTo(parent) {
            this.update(); // Update window position before adding it to parent.
            parent.addChild(this);
        }
    }

    //=========================================================================
    // Scene_Map
    //=========================================================================
    let speechBubbles = [];

    let Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
        Scene_Map_createDisplayObjects.call(this);

        let eventsWithBubbles = $gameMap.events()
            .filter(event => NOTETAG_BUBBLE in event.event().meta);
        for (let event of eventsWithBubbles) {
            let text = event.event().meta[NOTETAG_BUBBLE].replace(/\\n/g, "\n");
            speechBubbles.push(new Window_Bubble(event, text));
        }
    };

    let Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () {
        Scene_Map_terminate.call(this);

        for (let bubble of speechBubbles) {
            this.removeChild(bubble);
        }
        // Clear speechBubbles
        speechBubbles = [];
    }

    //=========================================================================
    // Game_Player
    //=========================================================================
    let Game_Player_updateAnimation = Game_Player.prototype.updateAnimation;
    Game_Player.prototype.updateAnimation = function () {
        Game_Player_updateAnimation.call(this);

        let scene = SceneManager._scene;
        for (let speechBubble of speechBubbles) {
            if (speechBubble.shouldBeVisible()) {
                if (!speechBubble.parent) {
                    speechBubble.addTo(scene);
                }
            } else {
                scene.removeChild(speechBubble);
            }
        }
    }

    //=========================================================================
    // Game_Interpreter
    //=========================================================================
    let Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function () {
        if (this._waitMode === WAITMODE_BUBBLE) {
            return isSpeechBubbleActive;
        }
        return Game_Interpreter_updateWaitMode();
    };
})();
