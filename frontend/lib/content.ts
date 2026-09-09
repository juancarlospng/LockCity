import type { ArchiveEntry, Drop, Person, Transmission } from "./types";
export interface ContentSource {
  getDrops(): Promise<Drop[]>;
  getPeople(): Promise<Person[]>;
  getArchive(): Promise<ArchiveEntry[]>;
  getTransmissions(): Promise<Transmission[]>;
}
export const content: ContentSource = {
  async getDrops() {
    return [];
  },
  async getPeople() {
    return [];
  },
  async getArchive() {
    return [];
  },
  async getTransmissions() {
    return [];
  },
};
export const EMPTY_COPY = {
  shop: {
    title: "The next chapter is taking shape",
    body: "Clothing and objects from Lock City. Explore the districts while the selection is being prepared.",
  },
  people: {
    title: "The first profiles are entering the city.",
    body: "Artists, athletes, musicians and makers. The people behind the purpose.",
  },
  archive: {
    title: "The archive is being restored.",
    body: "Past seasons, objects and moments from the city.",
  },
  transmissions: {
    title: "More signals on the way",
    body: "Stories, films and signals from the city.",
  },
  drops: {
    title: "Next drop",
    body: "The next chapter is taking shape. Release details will be shared here.",
  },
};
