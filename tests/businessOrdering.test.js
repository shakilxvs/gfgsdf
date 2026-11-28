import test from "node:test";
import assert from "node:assert/strict";
import { moveBusinessInOrder } from "../src/businessOrdering.js";

const businesses = [
  { id: "pellishoes", name: "Pellishoes" },
  { id: "casabella", name: "Casabella" },
  { id: "v3pl", name: "V3PL" },
  { id: "hug-home", name: "Hug & Home" }
];

test("moves a business down when dropped on a later business", () => {
  const result = moveBusinessInOrder(businesses, "pellishoes", "v3pl");
  assert.deepEqual(result.map(item => item.id), ["casabella", "v3pl", "pellishoes", "hug-home"]);
});

test("moves a business up when dropped on an earlier business", () => {
  const result = moveBusinessInOrder(businesses, "v3pl", "pellishoes");
  assert.deepEqual(result.map(item => item.id), ["v3pl", "pellishoes", "casabella", "hug-home"]);
});

test("does not mutate the original businesses array", () => {
  const original = [...businesses];
  moveBusinessInOrder(businesses, "casabella", "hug-home");
  assert.deepEqual(businesses, original);
});

test("returns a copy when source or target is missing or unchanged", () => {
  assert.notEqual(moveBusinessInOrder(businesses, "pellishoes", "pellishoes"), businesses);
  assert.deepEqual(moveBusinessInOrder(businesses, "missing", "v3pl"), businesses);
  assert.deepEqual(moveBusinessInOrder(businesses, "pellishoes", "missing"), businesses);
});
