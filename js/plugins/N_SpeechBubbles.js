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
// Metadata
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Displays text in speech bubbles above event.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins
 * 
 * @param Distance
 * @desc How far the player can be before the speech bubble is no longer visible.
 * @type number
 * @min 1
 * @max 10
 * @decimals 3
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
 * @arg targetSelector
 * @text Target
 * @desc Where the speech bubble will be displayed.
 * @type select
 * @option This event
 * @option Player
 * @option Event
 * @option Event by variable
 * @option Follower
 * @option Follower by variable
 * @default This event
 * 
 * @arg targetSelectorId
 * @parent target
 * @text Target ID
 * @desc The ID of the event, follower, or variable to select.
 *       Note: The first follower has an ID of 0.
 * @type number
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
 * @help Version 1.1.2
 * 
 * Speech bubbles support the following control characters:
 *      \v[n]           Replaced by the value of the nth variable.
 *      \n[n]           Replaced by the name of the nth actor.
 *      \p[n]           Replaced by the name of the nth party member.
 *      \g              Replaced by the currency unit.
 *      \c[n]           Draw the subsequent text in the nth color.
 *      \i[n]           Draw the nth icon.
 *      \{              Increase the text size by one step.
 *      \}              Decrease the text size by one step.
 *      \\              Replaced with the backslash character.
 * 
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 * Show bubble
 *      Shows a bubble above the selected target. Aside from "Player" and
 *      "This event", a target ID is needed.
 * 
 *      IMPORTANT: The ID of the first event or variable is 1.
 *                 The ID of the first follower is 0.
 * 
 * Execute script
 *      For experts only.
 * 
 *      Similar to the "Script..." event command, but gives you access to the
 *      various N_SpeechBubbles functions. This allows you to have more control
 *      over speech bubbles than is currently supported by this plugin.
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
    const COMMAND_ARG_TARGET_EVENT = "Event";
    const COMMAND_ARG_TARGET_EVENTBYVAR = "Event by variable";
    const COMMAND_ARG_TARGET_FOLLOWER = "Follower";
    const COMMAND_ARG_TARGET_FOLLOWERBYVAR = "Follower by variable";

    const COMMAND_SCRIPT = "script";

    const WAITMODE_BUBBLE = "bubble";

    const parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.Distance = Number(parameters.Distance) || 2;

    let currentInterpreter = null;
    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_SHOW, function (args) {
        currentInterpreter = this;

        const text = args.text;
        const target = {
            [COMMAND_ARG_TARGET_SELF]: getCurrentEvent(),
            [COMMAND_ARG_TARGET_PLAYER]: getPlayer(),
            [COMMAND_ARG_TARGET_EVENT]: getEventById(args.targetSelectorId),
            [COMMAND_ARG_TARGET_EVENTBYVAR]: getEventByVar(args.targetSelectorId),
            [COMMAND_ARG_TARGET_FOLLOWER]: getFollowerById(args.targetSelectorId),
            [COMMAND_ARG_TARGET_FOLLOWERBYVAR]: getFollowerByVar(args.targetSelectorId)
        }[args.targetSelector] || getEventById(args.targetSelector);
        const duration = Number(args.durationMs);
        const isBlocking = args.isBlocking.toLowerCase() === "true";

        showBubble(text, target, duration, isBlocking);
    });
    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_SCRIPT, function (args) {
        currentInterpreter = this;
        eval(args.script);
    });

    let blockingSpeechBubble = null;
    function showBubble(text, target, duration, isBlocking) {
        const scene = SceneManager._scene;

        const speechBubble = new Window_Bubble(target, text);
        speechBubble.addTo(scene);

        setTimeout(() => {
            speechBubble.remove();
        }, duration || speechBubble.textLength * 150);

        if (isBlocking) {
            blockingSpeechBubble = speechBubble;
            currentInterpreter.setWaitMode(WAITMODE_BUBBLE);
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

    function getEventByVar(varId) {
        return getEventById($gameVariables.value(varId));
    }

    function getFollowerById(id) {
        return $gamePlayer.followers().follower(id);
    }

    function getFollowerByVar(varId) {
        return getFollowerById($gameVariables.value(varId));
    }

    //=========================================================================
    // Window_Bubble
    //=========================================================================
    class Window_Bubble extends Window_Base {
        static activeBubbles = {};

        initialize(targetCharacter, text) {
            super.initialize(this.getRectForText(text));

            this.targetCharacter = targetCharacter;
            if (!Window_Bubble.activeBubbles[this.targetId])
                Window_Bubble.activeBubbles[this.targetId] = [];

            this.textLength = 0;
            this.drawTextEx(text, 0, 0);
        }

        get characterSprite() {
            return SceneManager._scene._spriteset._characterSprites
                .find(sprite => sprite._character === this.targetCharacter);
        }

        get targetPosition() {
            const sprite = this.characterSprite;
            return {
                x: sprite.x - this.width / 2,
                y: sprite.y - sprite.height - this.height - 10
            };
        }

        get targetId() {
            return {
                [Game_Event.name]: () => `e${this.targetCharacter.eventId()}`,
                [Game_Follower.name]: () => `f${this.targetCharacter._memberIndex}`,
                [Game_Player.name]: () => `p`
            }[this.targetCharacter.constructor.name]();
        }

        get activeBubbles() {
            return Window_Bubble.activeBubbles[this.targetId];
        }

        get activeBubble() {
            return this.activeBubbles.slice(-1)[0];
        }

        getRectForText(text) {
            const textDimensions = new Window_Base(new Rectangle(0, 0, 0, 0)).textSizeEx(text);
            let width = textDimensions.width + $gameSystem.windowPadding() * 2;
            let height = textDimensions.height + $gameSystem.windowPadding() * 2;
            width += width % 2; height += height % 2; // Dimensions must be even, otherwise a black bar will appear.
            return new Rectangle(0, 0, width, height);
        }

        flushTextState(textState) {
            this.textLength += textState.buffer.length - (textState.rtl ? 1 : 0);
            super.flushTextState(textState);
        }

        update() {
            const windowPosition = this.targetPosition;
            this.x = windowPosition.x;
            this.y = windowPosition.y;
            super.update();
        }

        isPlayerWithinDistance() {
            const distance = parameters.Distance;
            const xDist = $gamePlayer._realX - this.targetCharacter.x;
            const yDist = $gamePlayer._realY - this.targetCharacter.y;
            // Pythagoras: a^2 + b^2 = c^2
            return xDist * xDist + yDist * yDist <= distance * distance;
        }

        isActive() {
            return !!this.parent;
        }

        isOtherBubbleActive() {
            return this.activeBubble
                && this.activeBubble !== this;
        }

        addTo(parent) {
            if (this.parent) // Don't add if already have a parent.
                return;

            this.update(); // Update window position before adding it to parent.
            parent.addChild(this);
            // Used to ensure only 1 speech bubble is visible per target.
            this.activeBubbles.remove(this);
            this.activeBubble?.hide();
            this.activeBubbles.push(this);
            this.show();
        }

        remove() {
            if (!this.parent)
                return;

            this.parent.removeChild(this);
            this.activeBubbles.remove(this);
            this.activeBubble?.show();
        }
    }

    //=========================================================================
    // Scene_Map
    //=========================================================================
    const speechBubbles = [];

    const Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
        Scene_Map_createDisplayObjects.call(this);

        $gameMap.events().filter(e => {
            const event = e.event();
            return !!event && NOTETAG_BUBBLE in event.meta;
        }).forEach(e => {
            const text = e.event().meta[NOTETAG_BUBBLE].replace(/\\n/g, "\n");
            speechBubbles.push(new Window_Bubble(e, text));
        });
    };

    const Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () {
        Scene_Map_terminate.call(this);

        for (const bubble of speechBubbles)
            bubble.remove();

        // Clear speechBubbles
        speechBubbles.length = 0;
    }

    //=========================================================================
    // Game_Player
    //=========================================================================
    const Game_Player_updateAnimation = Game_Player.prototype.updateAnimation;
    Game_Player.prototype.updateAnimation = function () {
        Game_Player_updateAnimation.call(this);

        const scene = SceneManager._scene;
        for (const speechBubble of speechBubbles) {
            if (speechBubble.isPlayerWithinDistance() && !speechBubble.isOtherBubbleActive()) {
                speechBubble.addTo(scene);
            } else {
                speechBubble.remove();
            }
        }
    }

    //=========================================================================
    // Game_Interpreter
    //=========================================================================
    const Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function () {
        return this._waitMode === WAITMODE_BUBBLE ?
            blockingSpeechBubble.isActive() :
            Game_Interpreter_updateWaitMode.call(this);
    };
})();