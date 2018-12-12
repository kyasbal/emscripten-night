async function main() {
  const module = await import("../crate/pkg");
  module.run();
}
