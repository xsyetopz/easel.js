export type DocProperty = {
  name: string;
  type: string;
  description: string;
};

export type DocMethod = {
  name: string;
  signature: string;
  description: string;
};

export type DocSummary = {
  id: string;
  name: string;
  category: string;
  signature: string;
  description: string;
};

export type DocEntry = DocSummary & {
  properties: DocProperty[];
  methods: DocMethod[];
};
