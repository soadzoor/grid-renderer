export class BrowserWindow
{
	// --------------------------------------------------------------------------------------------------
	// Scroll functions

	private static getScrollX(): number
	{
		return window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
	}

	private static getScrollY(): number
	{
		return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
	}

	public static clientXYToLocalXY(clientX: number, clientY: number, element: Element)
	{
		const clientRect = element.getBoundingClientRect();

		const left = clientRect.left + BrowserWindow.getScrollX();
		const top = clientRect.top + BrowserWindow.getScrollY();

		return [
			clientX - left,
			clientY - top
		];
	}
}