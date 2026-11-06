export interface Domain {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export const domains = [
  {
    id: 'javascript-typescript',
    name: 'JavaScript & TypeScript',
    description: 'Language semantics, execution, types, and the runtime model.',
  },
  {
    id: 'browser-web-platform',
    name: 'Browser & Web Platform',
    description: 'The DOM, event loop, networking, storage, and browser internals.',
  },
  {
    id: 'css-rendering',
    name: 'CSS & Rendering',
    description: 'Layout, painting, compositing, typography, and responsive design.',
  },
  {
    id: 'frameworks-ui-architecture',
    name: 'Frameworks & UI Architecture',
    description: 'Component models, state, rendering strategies, and application structure.',
  },
  {
    id: 'ui-engineering',
    name: 'UI Engineering',
    description: 'Practical interface implementation, forms, tables, and interaction design.',
  },
  {
    id: 'performance-reliability',
    name: 'Performance & Reliability',
    description: 'Core Web Vitals, profiling, resilience, and production diagnostics.',
  },
  {
    id: 'frontend-system-design',
    name: 'Frontend System Design',
    description: 'Architecting scalable, maintainable frontend applications.',
  },
  {
    id: 'accessibility-security-testing',
    name: 'Accessibility, Security & Testing',
    description: 'Inclusive interfaces, browser security, and dependable verification.',
  },
] as const satisfies readonly Domain[];
