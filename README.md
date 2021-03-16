# @rbxts/character-viewport

A live-updating character viewport, which shows animations.

![Example](example.png)

To use:
```tsx
import { CharacterViewport } from '@rbxts/character-viewport';

const Players = game.GetService('Players');

// inside your Roact code
<CharacterViewport Player={Players.LocalPlayer}>
```

It's suggested that you unmount the component when not in use for performance reasons.

There are also static functions to trigger a re-render of a player's viewport locally:
```ts
import { CharacterViewport } from '@rbxts/character-viewport';

const Players = game.GetService('Players');

CharacterViewport.updatePlayer(Players.LocalPlayer);
```

_Based off of boatbomber's [character viewport](https://devforum.roblox.com/t/rendering-the-character-with-a-viewportframe/241369/31?u=xethlyx). I've changed a couple things, such as converting the Heartbeat functions to use a batch array, and adding Roact lifecycle hooks, but I suspect that boatbomber spent more time than his than mine, so this message exists as a head-nod._