export class ObjectUtils
{
	public static compare(obj1: any, obj2: any)
	{
		return JSON.stringify(obj1) === JSON.stringify(obj2);
	}

	public static clone(obj: any)
	{
		return JSON.parse(JSON.stringify(obj));
	}
}