import { useSensor, useSensors, KeyboardSensor, PointerSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * DnD Kit のセンサー設定（ポインター + キーボード）を返すカスタムフック。
 * アクセシビリティのためのキーボード操作に対応している。
 */
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
