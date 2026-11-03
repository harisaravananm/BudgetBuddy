import {
  BookOpen,
  Bus,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  Plane,
  Receipt,
  Repeat2,
  ShoppingBag,
  Target,
  Utensils,
} from "lucide-react";

export const categoryVisuals = {
  food: { icon: Utensils, color: "#e07a5f", label: "Food" },
  transport: { icon: Bus, color: "#3b82a0", label: "Transport" },
  rent: { icon: Home, color: "#8b6f9e", label: "Rent / Hostel" },
  books: { icon: BookOpen, color: "#c28b40", label: "Books" },
  travel: { icon: Plane, color: "#3b82a0", label: "Travel" },
  shopping: { icon: ShoppingBag, color: "#c26d8d", label: "Shopping" },
  education: { icon: GraduationCap, color: "#6f7fc4", label: "Education" },
  entertainment: { icon: Clapperboard, color: "#b47b43", label: "Entertainment" },
  subscriptions: { icon: Repeat2, color: "#537c9e", label: "Subscriptions" },
  health: { icon: HeartPulse, color: "#c36d72", label: "Health" },
  misc: { icon: Package, color: "#75828a", label: "Miscellaneous" },
  bills: { icon: Receipt, color: "#64748b", label: "Bills & Utilities" },
  "": { icon: Target, color: "var(--primary)", label: "Overall" },
};

export const categoryColor = (category) =>
  (categoryVisuals[category || ""] || categoryVisuals.misc).color;
