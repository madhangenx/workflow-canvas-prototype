'use client';

import { Canvas } from '@/components/canvas/engine';
import { nodeTypes } from './nodes';

/**
 * WorkflowCanvas – thin wrapper around the custom Canvas engine.
 * All state management is inside the engine and the Zustand store.
 */
export function WorkflowCanvas() {
  return <Canvas nodeTypes={nodeTypes} />;
}
