// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * Updated for MemoriAI with additional icons.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  plus: "add",
  "clock.fill": "schedule",
  "person.fill": "person",
  "doc.fill": "description",
  "text.alignleft": "text-fields",
  "play.fill": "play-arrow",
  pencil: "edit",
  checkmark: "check",
  "checkmark.circle.fill": "check-circle",
  trash: "delete",
  folder: "folder",
  "folder.fill": "folder",
  "doc.text.fill": "article",
  "flame.fill": "local-fire-department",
  "bell.fill": "notifications",
  "icloud.fill": "cloud",
  "moon.fill": "nightlight",
  "square.and.arrow.up": "share",
  "star.fill": "star",
  "envelope.fill": "mail",
  "info.circle.fill": "info",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
