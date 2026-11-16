
import {
    world,
    system
} from "@minecraft/server";

import { sendNotification } from "main.js"

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const PlayerSelector = { name: "victim", type: "PlayerSelector" };
    const line1 = { name: "title", type: "String" };
    const line2 = { name: "body", type: "String" };
    const imagepath = { name: "image_path", type: "String" };
    const count = { name: "count", type: "Integer" };
    const element = { name: "element", type: "String" };
    const background = { name: "background", type: "String" };
    const sendToast = {
        name: "mm:testpopup",
        description: "Send a custom toast message to a player.",
        cheatsRequired: false,
        permissionLevel: 1,
        mandatoryParameters: [PlayerSelector, count, line1],
        optionalParameters: [line2, imagepath, element, background]
    }
    registry.registerCommand(sendToast,
        (source, victim, number, title, body, image, element, bgPath) => {
            system.run(() => {
                if (body == undefined) body = ""
                if (image == undefined) image = "textures/icons/category/mm/icon"
                if (number == undefined) number = 1
                if (number < 1) number = 1
                if (element == undefined) element = "mana"
                const toastBackground = bgPath == undefined ? undefined : bgPath
                const message = `§d${title}\n§r${body}`
                for (const player of victim) {
                    for (let i = 0; i < number; i++)
                        system.runTimeout(() => {

                            sendNotification(player, message, image, element, toastBackground)
                        }, i)

                }
            })
        }
    );
});