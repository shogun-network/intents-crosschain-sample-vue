import { ref } from "vue";

export type SwapStage = "processing" | "initiated" | "success" | "error";

export interface SwapModalState {
  isOpen: boolean;
  stage: SwapStage | null;
  message: string;
}

/**
 * ✅ Shared global modal state across the entire app.
 * This ensures all instances of `useSwapModal()` refer to the same modal.
 */
const modal = ref<SwapModalState>({
  isOpen: false,
  stage: null,
  message: "",
});

function openModal(stage: SwapStage, message?: string) {
  modal.value = {
    isOpen: true,
    stage,
    message: message || "",
  };
}

function closeModal() {
  modal.value.isOpen = false;
}

/**
 * Composable hook — returns the shared modal state & actions.
 */
export function useSwapModal() {
  return { modal, openModal, closeModal };
}
