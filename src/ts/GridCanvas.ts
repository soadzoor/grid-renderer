import {BrowserWindow} from "utils/BrowserWindow";
import {Constants} from "utils/Constants";
import {Functions} from "utils/Functions";
import {MathUtils} from "utils/MathUtils";
import {ObjectUtils} from "utils/ObjectUtils";
import {ISignal, Signal} from "utils/Signal";

export class GridCanvas
{
	private _canvas: HTMLCanvasElement;
	private _ctx: CanvasRenderingContext2D;
	private _requestAnimationFrameId: number = 0;
	private readonly _rowSize: number = 30;
	private readonly _padding: number = this._rowSize / 3;

	private _visibleDataOnLastFrame: string[][] = [];
	private _selectionOnLastFrame: number[] = [];
	private _activeCellOnLastFrame: number[] = [];
	private _offsetOnLastFrame: number[] = [];
	private _frozenColumnCountOnLastFrame: number = 0;

	private _dragStartCoords: number[] = [];
	private _viewBoxOffsetAtDragStart: number[] = [];

	private _frozenColumnsWidthInPx: number = 0;
	private _startXInPx: number = 0;
	private _startYInPx: number = 0;

	private _startX: number = 0;
	private _endX: number = 0;
	private _startY: number = 0;

	// We scroll based on the value below. Eg.: if offset = [30, 50],
	// that means that the grid is shifted by 30 px to the left, and 50 px to the top
	public viewBoxOffset: number[] = [0, 0];
	public selection: number[] = [];
	public activeCell: number[] = [];

	public frozenColumnCount: number = 0;

	// We can assume that data[x].length === columnsWidths.length
	public data: string[][] = [];
	public columnsWidths: number[] = [];

	public readonly signals: {
		mouseDown: ISignal;
	} = {
		mouseDown: Signal.create<number[]>()
	};

	constructor(canvas: HTMLCanvasElement)
	{
		this._canvas = canvas;
		this._ctx = this._canvas.getContext("2d") as CanvasRenderingContext2D;
		this._ctx.font = `${Math.round(this._rowSize * 0.6)}px Arial`;

		this.addEventListeners();
		this._requestAnimationFrameId = window.requestAnimationFrame(this.render);
	}

	private addEventListeners()
	{
		this._canvas.addEventListener("mousedown", this.onMouseDown);
		this._canvas.addEventListener("wheel", this.onMouseWheel);
		window.addEventListener("contextmenu", this.onContextMenu);
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("mouseup", this.onMouseUp);
	}

	private removeEventListeners()
	{
		this._canvas.removeEventListener("mousedown", this.onMouseDown);
		this._canvas.removeEventListener("wheel", this.onMouseWheel);
		window.removeEventListener("contextmenu", this.onContextMenu);
		window.removeEventListener("mousemove", this.onMouseMove);
		window.removeEventListener("mouseup", this.onMouseUp);
	}

	private onMouseWheel = (event: WheelEvent) =>
	{
		const signY = Math.sign(event.deltaY);

		const amountInPx = this._rowSize * 1.5;

		if (Math.abs(signY) > 0)
		{
			this.viewBoxOffset[1] += signY * amountInPx;
		}

		const signX = Math.sign(event.deltaX);
		if (Math.abs(signX) > 0)
		{
			this.viewBoxOffset[0] += signX * amountInPx;
		}
	};

	private onContextMenu = (event: MouseEvent) =>
	{
		event.preventDefault();
		return false;
	};

	private mousePosToCellPos(localXY: number[])
	{
		const localX = localXY[0];
		const localY = localXY[1];

		let cellX: number | null = null;
		let cellY: number | null = null;

		let endX = this._endX;
		let startX = this._startX;
		let pointer = this._startXInPx;

		if (0 < this.frozenColumnCount && localX <= this._frozenColumnsWidthInPx)
		{
			startX = 0;
			endX = this.frozenColumnCount;
			pointer = 0;
		}

		for (let i = startX; i <= endX; ++i)
		{
			const leftEdge = pointer;
			const rightEdge = leftEdge + this.columnsWidths[i];
			pointer = rightEdge;

			if (leftEdge <= localX && localX <= rightEdge)
			{
				cellX = i;
				break;
			}
		}

		cellY = this._startY + Math.floor((localY - this._startYInPx) / this._rowSize);

		if (cellY >= this.data.length)
		{
			cellY = null;
		}

		return [
			cellX,
			cellY
		];
	}

	private onMouseDown = (event: MouseEvent) =>
	{
		const localXY = BrowserWindow.clientXYToLocalXY(event.clientX, event.clientY, this._canvas);

		if (event.button === Constants.MAIN_MOUSE_BUTTON)
		{
			const cellPos = this.mousePosToCellPos(localXY);
			if (MathUtils.isValidNumber(cellPos[0]) && MathUtils.isValidNumber(cellPos[1]))
			{
				this.signals.mouseDown.dispatch(cellPos as number[]);
			}
		}
		else if (event.button === Constants.SECONDARY_MOUSE_BUTTON)
		{
			this._dragStartCoords = localXY;
			this._viewBoxOffsetAtDragStart = ObjectUtils.clone(this.viewBoxOffset);
		}
	};

	private onMouseMove = (event: MouseEvent) =>
	{
		if (this._dragStartCoords.length === 2)
		{
			const currentCoords = BrowserWindow.clientXYToLocalXY(event.clientX, event.clientY, this._canvas);

			// Delta is calculated from the "start" point, NOT the previous point
			const delta = [
				currentCoords[0] - this._dragStartCoords[0],
				currentCoords[1] - this._dragStartCoords[1]
			];

			this.viewBoxOffset[0] = this._viewBoxOffsetAtDragStart[0] - delta[0];
			this.viewBoxOffset[1] = this._viewBoxOffsetAtDragStart[1] - delta[1];
		}
	};

	private onMouseUp = (event: MouseEvent) =>
	{
		if (event.button === Constants.SECONDARY_MOUSE_BUTTON)
		{
			this._dragStartCoords.length = 0;
		}
	};

	// Returns the viewbox of the visible, movable (non-frozen) cells in pixels
	// These coordinates are NOT shifted by frozen cells
	private get viewBox()
	{
		const frozenCellsWidthInPx = MathUtils.sumOfArray(this.columnsWidths.slice(0, this.frozenColumnCount));

		return {
			startX: this.viewBoxOffset[0],
			startY: this.viewBoxOffset[1],
			endX: this.viewBoxOffset[0] + this._canvas.width - frozenCellsWidthInPx,
			endY: this.viewBoxOffset[1] + this._canvas.height
		};
	}

	// Cell coords
	private getStartXEndXForVisibleMovableColumns()
	{
		// Frozen columns are handled independently
		let pointer: number = 0;

		const viewBox = this.viewBox;

		let startX: number = this.frozenColumnCount;
		let endX: number = this.frozenColumnCount;

		for (let i = this.frozenColumnCount; i < this.columnsWidths.length; ++i)
		{
			pointer += this.columnsWidths[i];

			if (pointer >= viewBox.startX)
			{
				startX = i;
				endX = i;
				break;
			}
		}

		for (let i = startX + 1; i < this.columnsWidths.length; ++i)
		{
			pointer += this.columnsWidths[i];
			endX = i;
			if (pointer >= viewBox.endX)
			{
				break;
			}
		}

		return {
			startX,
			endX
		};
	}

	// Cell coords
	private getStartYEndYForVisibleRows()
	{
		const viewBox = this.viewBox;

		return {
			startY: Math.floor(viewBox.startY / this._rowSize),
			endY: Math.floor(viewBox.endY / this._rowSize)
		};
	}

	// Moveable cells = not frozen cells
	private getBBoxOfMovableVisibleCells()
	{
		const {startX, endX} = this.getStartXEndXForVisibleMovableColumns();
		const {startY, endY} = this.getStartYEndYForVisibleRows();

		return {
			startX,
			startY,
			endX,
			endY
		};
	}

	private isCellSelected(cellX: number, cellY: number)
	{
		for (let i = 0; i < this.selection.length - 1; i += 2)
		{
			if (this.selection[i] === cellX && this.selection[i + 1] === cellY)
			{
				return true;
			}
		}

		return false;
	}

	private isCellActive(cellX: number, cellY: number)
	{
		return this.activeCell.length === 2 && this.activeCell[0] === cellX && this.activeCell[1] === cellY;
	}

	private createDrawRectFunction(left: number, top: number, width: number, height: number, strokeStyle: string, lineWidth: number, createNewPath: boolean)
	{
		return () =>
		{
			if (createNewPath)
			{
				this._ctx.beginPath();
			}

			this._ctx.lineWidth = lineWidth;
			this._ctx.strokeStyle = strokeStyle;
			this._ctx.rect(left, top, width, height);

			if (createNewPath)
			{
				this._ctx.stroke();
			}
		};
	}

	private drawCells(data: string[][], startXInPx: number, startYInPx: number, startX: number)
	{
		const ctx = this._ctx;

		ctx.beginPath();

		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 2;

		const rowSize = this._rowSize;
		const padding = this._padding;

		let posX = startXInPx;
		let posY = startYInPx;

		let drawActiveBox: () => void = Functions.emptyFunction;
		const drawSelectionBoxes: (() => void)[] = [];

		for (let cellY = 0; cellY < data.length; ++cellY)
		{
			const row = data[cellY];
			for (let cellX = 0; cellX < row.length; ++cellX)
			{
				const cellContent = row[cellX];
				const colSize = this.columnsWidths[startX + cellX];
				// render cell text
				ctx.fillText(cellContent, posX + padding, posY + rowSize - padding);
				// render cell borders
				ctx.rect(posX, posY, colSize, rowSize);

				if (this.selection.find(coord => coord))

				if (this.isCellSelected(startX + cellX, this._startY + cellY))
				{
					drawSelectionBoxes.push(this.createDrawRectFunction(posX, posY, colSize, rowSize, "#0000FF", 3, false));
				}
				if (this.isCellActive(startX + cellX, this._startY + cellY))
				{
					drawActiveBox = this.createDrawRectFunction(posX, posY, colSize, rowSize, "#00FF00", 3, true);
				}

				posX += colSize;
			}

			posX = startXInPx;
			posY += rowSize;
		}

		ctx.stroke();

		// Draw selected cells' borders
		ctx.beginPath();
		for (const drawSelectionBox of drawSelectionBoxes)
		{
			drawSelectionBox();
		}
		ctx.stroke();

		// Draw active cell's border
		drawActiveBox();
	}

	private render = () =>
	{
		this._requestAnimationFrameId = window.requestAnimationFrame(this.render);

		const fullDataWidthInPx = MathUtils.sumOfArray(this.columnsWidths);
		const fullDataHeightInPx = this._rowSize * this.data.length;

		this.viewBoxOffset[0] = MathUtils.clamp(this.viewBoxOffset[0], 0, Math.max(0, fullDataWidthInPx - this._canvas.width));
		this.viewBoxOffset[1] = MathUtils.clamp(this.viewBoxOffset[1], 0, Math.max(0, fullDataHeightInPx - this._canvas.height));

		const {startX, startY, endX, endY} = this.getBBoxOfMovableVisibleCells();

		this._startX = startX;
		this._endX = endX;
		this._startY = startY;

		const visibleData = this.data.slice(startY, endY + 1).map(row => row.slice(startX, endX + 1));

		const needsUpdate = (
			!ObjectUtils.compare(this._activeCellOnLastFrame, this.activeCell) ||
			!ObjectUtils.compare(this._offsetOnLastFrame, this.viewBoxOffset) ||
			!ObjectUtils.compare(this._selectionOnLastFrame, this.selection) ||
			!ObjectUtils.compare(this._frozenColumnCountOnLastFrame, this.frozenColumnCount) ||
			!ObjectUtils.compare(this._visibleDataOnLastFrame, visibleData)
		);

		if (needsUpdate)
		{
			this._visibleDataOnLastFrame = ObjectUtils.clone(visibleData);
			this._selectionOnLastFrame = ObjectUtils.clone(this.selection);
			this._activeCellOnLastFrame = ObjectUtils.clone(this.activeCell);
			this._offsetOnLastFrame = ObjectUtils.clone(this.viewBoxOffset);
			this._frozenColumnCountOnLastFrame = this.frozenColumnCount;

			const ctx = this._ctx;

			ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

			this._frozenColumnsWidthInPx = MathUtils.sumOfArray(this.columnsWidths.slice(0, this.frozenColumnCount));

			this._startXInPx = this._frozenColumnsWidthInPx + MathUtils.sumOfArray(this.columnsWidths.slice(this.frozenColumnCount, startX)) - this.viewBoxOffset[0];
			this._startYInPx = this._rowSize * startY - this.viewBoxOffset[1];

			this.drawCells(visibleData, this._startXInPx, this._startYInPx, startX);

			if (this.frozenColumnCount > 0)
			{
				// Draw frozenColumns
				ctx.beginPath();
				const visibleFrozenData = this.data.slice(startY, endY + 1).map(row => row.slice(0, this.frozenColumnCount));
				const prevFillStyle = this._ctx.fillStyle;
				ctx.fillStyle = "#FFFFFF";
				ctx.fillRect(0, 0, this._frozenColumnsWidthInPx, this._canvas.height);
				ctx.fillStyle = prevFillStyle;
				this.drawCells(visibleFrozenData, 0, this._startYInPx, 0);
			}
		}
	};

	public destroy()
	{
		for (const key in this.signals)
		{
			this.signals[key].removeAll();
		}

		cancelAnimationFrame(this._requestAnimationFrameId);
		this.removeEventListeners();
	}
}