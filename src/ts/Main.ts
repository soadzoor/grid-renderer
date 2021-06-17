import {GridCanvas} from "GridCanvas";
import {MathUtils} from "utils/MathUtils";
import {TimeUtils} from "utils/TimeUtils";

export class Main
{
	private _gridCanvas: GridCanvas = new GridCanvas(document.getElementById("gridCanvas") as HTMLCanvasElement);

	constructor()
	{
		this._gridCanvas.frozenColumnCount = 2;
		this._gridCanvas.data = this.createDummyData();
		this._gridCanvas.columnsWidths = this._gridCanvas.data[0].map(v => MathUtils.randomFromInterval(80, 120));

		this._gridCanvas.signals.mouseDown.add(this.onCellMouseDown);

		this.initDemo();

		this.addEventListeners();
	}

	private onCellMouseDown = (cellCoords: number[]) =>
	{
		this._gridCanvas.activeCell = cellCoords;
	};

	private createDummyData()
	{
		const dataColumnCount = 20;
		const dataRowCount = 50;

		const dummyData: string[][] = [];

		for (let i = 0; i < dataRowCount; ++i)
		{
			const row: string[] = [];
			for (let j = 0; j < dataColumnCount; ++j)
			{
				row.push(`${i * dataColumnCount + j}`);
			}

			dummyData.push(row);
		}

		return dummyData;
	}

	private addEventListeners()
	{
		window.addEventListener("keydown", this.onKeyDown);
	}

	private removeEventListeners()
	{
		window.removeEventListener("keydown", this.onKeyDown);
	}

	private onKeyDown = (event: KeyboardEvent) =>
	{
		const {activeCell} = this._gridCanvas;

		if (activeCell.length === 2)
		{
			switch (event.key)
			{
				case "Escape":
					activeCell.length = 0;
					break;
				case "ArrowLeft":
					if (activeCell[0] > 0)
					{
						activeCell[0]--;
					}
					break;
				case "ArrowRight":
					if (activeCell[0] < this._gridCanvas.data[0].length - 1)
					{
						activeCell[0]++;
					}
					break;
				case "ArrowUp":
					if (activeCell[1] > 0)
					{
						activeCell[1]--;
					}
					break;
				case "ArrowDown":
					if (activeCell[1] < this._gridCanvas.data.length - 1)
					{
						activeCell[1]++;
					}
					break;
			}
		}
	};

	private async initDemo()
	{
		await TimeUtils.sleep(1000);
		this._gridCanvas.activeCell = [4, 9];

		await TimeUtils.sleep(500);
		this._gridCanvas.selection = [6, 2, 3, 5, 4, 5, 5, 5, 3, 6, 4, 6, 5, 6, 0, 8];

		await TimeUtils.sleep(2500);
		this._gridCanvas.activeCell = [];

		await TimeUtils.sleep(500);
		this._gridCanvas.selection = [];
	}
}

const main = new Main();