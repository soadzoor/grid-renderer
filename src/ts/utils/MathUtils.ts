export class MathUtils
{
	// https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
	public static randomFromInterval(min: number, max: number)
	{ // min and max included
		return Math.random() * (max - min) + min;
	}

	public static clamp(x: number, min: number, max: number): number
	{
		return x < min ? min : (x > max ? max : x);
	}

	public static isValidNumber(value: number | null)
	{
		if (value === null) return false;
		if (value === undefined) return false;
		if (isNaN(value)) return false;
		if (value === Infinity) return false;
		if (value === -Infinity) return false;

		return true;
	}

	public static sumOfArray(arr: number[])
	{
		let sum: number = 0;
		for (const val of arr)
		{
			sum += val;
		}

		return sum;
	}
}