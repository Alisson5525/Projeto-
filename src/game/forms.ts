// Shows server forms, retrying while the player is busy (chat/inventory open).
import { type Player, system } from "@minecraft/server";
import { type ActionFormData, type ActionFormResponse, FormCancelationReason, type ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";

export async function show(player: Player, form: ActionFormData, tries?: number): Promise<ActionFormResponse>;
export async function show(player: Player, form: ModalFormData, tries?: number): Promise<ModalFormResponse>;
export async function show(player: Player, form: ActionFormData | ModalFormData, tries = 40): Promise<ActionFormResponse | ModalFormResponse> {
  for (let i = 0; ; i++) {
    const response = await (form as ActionFormData).show(player);
    if (!response.canceled || response.cancelationReason !== FormCancelationReason.UserBusy || i >= tries) return response;
    await new Promise<void>((resolve) => system.runTimeout(resolve, 5));
  }
}
