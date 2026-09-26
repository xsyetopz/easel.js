// Naive port: three.js statics called on EASEL classes.
import { AnimationClip, Node } from "@xsyetopz/easel";

export const clip = AnimationClip.findByName([], "Walk"); // expect TS2339
export const up = Node.DEFAULT_UP; // expect TS2339
