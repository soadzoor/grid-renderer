export class TimeUtils
{
	public static sleep(durationInMs: number)
	{
		return new Promise<void>((resolve, reject) =>
		{
			setTimeout(resolve, durationInMs);
		});
	}
}