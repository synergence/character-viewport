import Roact from '@rbxts/roact';

const RunService = game.GetService('RunService');

interface CharacterViewportProps {
	Player: Player;
	Offset?: CFrame;
}

/**
 * A dynamic viewport for displaying a Player's character
 */
export class CharacterViewport extends Roact.Component<CharacterViewportProps> {
	public static readonly CLONEABLE_CLASSES: ReadonlySet<string> = [
		'MeshPart',
		'Part',
		'Accoutrement',
		'Pants',
		'Shirt',
		'Humanoid'
	].reduce((currentValue, nextValue) => {
		currentValue.add(nextValue);
		return currentValue;
	}, new Set<string>()); // get that nice O(1) index time

	private static viewportInstances = new Map<CharacterViewport, true>();

	/**
	 * Force a re-render of a player's character
	 * @param player The player to re-render
	 */
	public static updatePlayer(player: Player) {
		for (const [characterViewport] of pairs(this.viewportInstances)) {
			if (characterViewport.props.Player !== player) return;

			characterViewport.loadCharacter();
		}
	}

	private viewportRef = Roact.createRef<ViewportFrame>();
	private cameraRef = Roact.createRef<Camera>();

	private debounce = false;
	private runConnection: RBXScriptConnection | undefined;

	private rootPart: BasePart | undefined;
	private loadedCharacter: Model | undefined;
	private batchUpdateBasePart: Array<[BasePart, BasePart]> = [];
	private batchUpdateAccoutrement: Array<[Accoutrement, Accoutrement]> = [];

	public didMount() {
		CharacterViewport.viewportInstances.set(this, true);
		this.loadCharacter();

		this.viewportRef.getValue()!.CurrentCamera = this.cameraRef.getValue();

		this.runConnection = RunService.Heartbeat.Connect(() => {
			for (const [index, [original, clone]] of pairs(this.batchUpdateBasePart)) {
				if (!original || original.Parent === undefined) {
					this.batchUpdateBasePart.remove(index);
					clone.Destroy();
					continue;
				}

				clone.CFrame = original.CFrame;
			}

			for (const [index, [original, clone]] of pairs(this.batchUpdateAccoutrement)) {
				if (!original || original.Parent === undefined) {
					this.batchUpdateBasePart.remove(index);
					clone.Destroy();
					continue;
				}

				const handle = clone.FindFirstChild('Handle') as BasePart | undefined;
				if (handle) {
					handle.CFrame = (original as typeof original & { Handle: BasePart }).Handle.CFrame;
				}
			}

			const camera = this.cameraRef.getValue();
			if (camera && this.rootPart) {
				camera.CFrame = new CFrame(
					this.rootPart.CFrame.ToWorldSpace(this.props.Offset ?? new CFrame(new Vector3(0, 1.5, -10))).Position,
					this.rootPart.Position
				);
			}
		});
	}

	public willUnmount() {
		CharacterViewport.viewportInstances.delete(this);
		this.runConnection?.Disconnect();
	}

	public didUpdate(previousProps: CharacterViewportProps) {
		if (previousProps.Player === this.props.Player) return;

		this.loadCharacter();
	}

	private loadCharacter() {
		if (this.debounce) return;
		this.debounce = true;

		this.loadedCharacter?.Destroy();
		this.batchUpdateBasePart.clear();
		this.batchUpdateAccoutrement.clear();

		this.rootPart = undefined;

		const character = this.props.Player.Character || this.props.Player.CharacterAdded.Wait()[0];
		if (!this.props.Player.HasAppearanceLoaded()) this.props.Player.CharacterAppearanceLoaded.Wait();

		this.loadedCharacter = new Instance('Model');
		this.loadedCharacter.Name = '';

		for (const descendant of character.GetDescendants()) {
			if (!CharacterViewport.CLONEABLE_CLASSES.has(descendant.ClassName)) continue;

			const originalArchival = descendant.Archivable;

			descendant.Archivable = true;
			const clonedInstance = descendant.Clone();
			descendant.Archivable = originalArchival;

			switch (clonedInstance.ClassName) {
				case 'Humanoid': {
					for (const humanoidState of Enum.HumanoidStateType.GetEnumItems()) {
						if (humanoidState === Enum.HumanoidStateType.None) continue;
						(clonedInstance as Humanoid).SetStateEnabled(humanoidState, false);
					}

					break;
				}
				case 'MeshPart':
				case 'Part': {
					if (clonedInstance.Name === 'HumanoidRootPart') this.rootPart = clonedInstance as BasePart;

					this.batchUpdateBasePart.push([descendant as BasePart, clonedInstance as BasePart]);

					break;
				}
				case 'Accoutrement': {
					this.batchUpdateAccoutrement.push([descendant as Accoutrement, clonedInstance as Accoutrement]);

					break;
				}
			}

			clonedInstance.Parent = this.loadedCharacter;
		}

		this.loadedCharacter.Parent = this.viewportRef.getValue();

		this.debounce = false;
	}

	public render() {
		return <viewportframe Ref={this.viewportRef} BackgroundTransparency={1} Size={new UDim2(1, 0, 1, 0)}>
			<camera Ref={this.cameraRef} />
		</viewportframe>
	}
}