import type { DietType } from "@/models/User";
import type { TrafficLight } from "@/models/Poll";

export interface MemberProfile {
  name: string;
  dietType?: DietType;
  allergies?: string[];
  spiceTolerance?: "low" | "medium" | "high";
}

export interface RestaurantTags {
  [key: string]: string | undefined;
  amenity?: string;
  cuisine?: string;
  name?: string;
}

export interface AffectedMember {
  name: string;
  dietType: DietType;
  status: "unsuitable" | "limited";
}

export interface CompatibilityResult {
  score: number;
  light: TrafficLight;
  reasons: string[];
  notes: string[];
  affectedMembers: AffectedMember[];
  impactSummary: string | null;
}

const SPICY_CUISINES = /indian|thai|sichuan|szechuan|mexican|korean|indonesian/;

function dietLabel(dietType: DietType, count: number) {
  const plural = count === 1 ? "" : "s";
  switch (dietType) {
    case "veg":
      return `vegetarian${plural}`;
    case "vegan":
      return `vegan${plural}`;
    case "jain":
      return `Jain diner${plural}`;
    default:
      return `diner${plural}`;
  }
}

function dietShortLabel(dietType: DietType) {
  switch (dietType) {
    case "veg":
      return "Vegetarian";
    case "vegan":
      return "Vegan";
    case "jain":
      return "Jain";
    default:
      return "Non-veg";
  }
}

function matchForDiet(
  dietType: DietType,
  tags: RestaurantTags,
  categories: string[]
): { value: number; reason?: string } {
  const cuisine = (tags.cuisine || "").toLowerCase();
  const looksIndian = /indian|south_indian|north_indian|mughlai|punjabi|gujarati/.test(cuisine);
  const vegTag = tags["diet:vegetarian"];
  const veganTag = tags["diet:vegan"];

  // Geoapify's category tree carries an explicit vegan/vegetarian signal
  // (e.g. "catering.restaurant.vegan") that Overpass never gave us — trust
  // it over the looser OSM diet: tags when present.
  const categoryVegan = categories.some((c) => c.endsWith(".vegan"));
  const categoryVegetarian = categoryVegan || categories.some((c) => c.endsWith(".vegetarian"));

  switch (dietType) {
    case "non-veg":
      return { value: 1 };

    case "veg": {
      if (categoryVegetarian || vegTag === "only" || vegTag === "yes") return { value: 1 };
      if (vegTag === "no") return { value: 0, reason: "marked non-vegetarian, no veg tag found" };
      if (looksIndian) return { value: 0.75, reason: "vegetarian options likely but unconfirmed" };
      return { value: 0.4, reason: "vegetarian options unconfirmed" };
    }

    case "vegan": {
      if (categoryVegan || veganTag === "only" || veganTag === "yes") return { value: 1 };
      if (veganTag === "no") return { value: 0, reason: "marked as not vegan-friendly" };
      if (vegTag === "only") return { value: 0.6, reason: "vegetarian-only, but vegan options unconfirmed" };
      if (looksIndian && vegTag === "yes") return { value: 0.5, reason: "has veg options, but vegan unconfirmed" };
      return { value: 0.25, reason: "vegan options unconfirmed" };
    }

    case "jain": {
      if (vegTag === "no") return { value: 0, reason: "non-vegetarian, unsafe for Jain diners" };
      if (categoryVegetarian || vegTag === "only" || vegTag === "yes") {
        return { value: 0.6, reason: "vegetarian, but Jain prep (no onion/garlic/root veg) unconfirmed" };
      }
      if (looksIndian) return { value: 0.45, reason: "Jain-friendly options unconfirmed" };
      return { value: 0.2, reason: "Jain-friendly options unconfirmed" };
    }

    default:
      return { value: 1 };
  }
}

function formatMemberList(members: AffectedMember[]) {
  const labels = members.map((m) => `${m.name} (${dietShortLabel(m.dietType)})`);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function scoreRestaurant(
  tags: RestaurantTags,
  members: MemberProfile[],
  categories: string[] = []
): CompatibilityResult {
  const withDiet = members.filter((m): m is MemberProfile & { dietType: DietType } => Boolean(m.dietType));

  if (withDiet.length === 0) {
    return { score: 100, light: "green", reasons: [], notes: [], affectedMembers: [], impactSummary: null };
  }

  const entries = withDiet.map((member) => ({
    member,
    ...matchForDiet(member.dietType, tags, categories),
  }));

  const dietCounts = new Map<DietType, number>();
  withDiet.forEach((m) => dietCounts.set(m.dietType, (dietCounts.get(m.dietType) ?? 0) + 1));

  const reasons: string[] = [];
  for (const [dietType, count] of dietCounts) {
    const { reason } = matchForDiet(dietType, tags, categories);
    if (reason) {
      reasons.push(`${count} ${dietLabel(dietType, count)}: ${reason}`);
    }
  }

  const weightedSum = entries.reduce((sum, e) => sum + e.value, 0);
  const score = Math.round((weightedSum / withDiet.length) * 100);

  let light: TrafficLight;
  if (score >= 100) light = "green";
  else if (score >= 50) light = "yellow";
  else light = "red";

  const affectedMembers: AffectedMember[] = entries
    .filter((e) => e.value < 1)
    .map((e) => ({
      name: e.member.name,
      dietType: e.member.dietType,
      status: e.value === 0 ? "unsuitable" : "limited",
    }));

  let impactSummary: string | null = null;
  if (light !== "green" && affectedMembers.length > 0) {
    const unsuitable = affectedMembers.filter((m) => m.status === "unsuitable");
    const target = unsuitable.length > 0 ? unsuitable : affectedMembers;
    const verb = unsuitable.length > 0 ? "Not suitable for" : "Limited options for";
    const emoji = light === "red" ? "🔴" : "🟡";
    const label = light === "red" ? "Red" : "Yellow";
    impactSummary = `${emoji} ${label} - ${verb} ${formatMemberList(target)}`;
  }

  const notes: string[] = [];

  const allergyMembers = members.filter((m) => m.allergies && m.allergies.length > 0);
  if (allergyMembers.length > 0) {
    const uniqueAllergies = [...new Set(allergyMembers.flatMap((m) => m.allergies ?? []))];
    const glutenFreeConfirmed = tags["diet:gluten_free"] === "yes" || tags["diet:gluten_free"] === "only";
    const unconfirmed = uniqueAllergies.filter((a) => !(a === "Gluten" && glutenFreeConfirmed));

    if (glutenFreeConfirmed && uniqueAllergies.includes("Gluten")) {
      notes.push("Tagged gluten-free friendly — still confirm severity with staff");
    }
    if (unconfirmed.length > 0) {
      notes.push(`Allergy info isn't fully tracked — confirm ${unconfirmed.join(", ")} with staff`);
    }
  }

  const cuisine = (tags.cuisine || "").toLowerCase();
  const lowSpiceCount = members.filter((m) => m.spiceTolerance === "low").length;
  if (lowSpiceCount > 0 && SPICY_CUISINES.test(cuisine)) {
    notes.push(
      `${lowSpiceCount} member${lowSpiceCount === 1 ? " has" : "s have"} low spice tolerance — ask staff to adjust heat`
    );
  }

  return { score, light, reasons, notes, affectedMembers, impactSummary };
}
