export interface ISignal
{
	add(listener: Function, listenerContext?: any): void;
	add(listener: Function, listenerContext?: any): void;
	addAndCall(listener: Function, listenerContext?: any): void;
	addOnce(listener: Function, listenerContext?: any): void;
	remove(listener: Function, listenerContext?: any): boolean;
	removeAll(): void;
	halt(): void;
	dispatch(...args: any[]): void;
	bindings: IBinding[];
}

interface ISignalP1<T1> extends ISignal
{
	add(listener: (p1: T1) => void, listenerContext?: any, priority?: number): void;
	addOnce(listener: (p1: T1) => void, listenerContext?: any, priority?: number): void;
	remove(listener: (p1: T1) => void, listenerContext?: any): boolean;
	dispatch(p1: T1): void;
}

interface IBinding
{
	listener: Function;
	context?: any;
	isOnce: boolean;
	priority: number;
}

export class Signal implements ISignal
{

	// --------------------------------------------------------------------------------------------------
	// static create method

	public static create<T>(): ISignalP1<T>;

	public static create()
	{
		return new Signal();
	}

	protected _bindings: IBinding[];
	protected _shouldPropagate = true;

	constructor()
	{
		this._bindings = [];
	}

	public add(listener: Function, context?: any, priority = 0)
	{
		this.registerListener(listener, false, context, priority);
	}

	public addAndCall(listener: Function, context?: any, priority = 0)
	{
		this.registerListener(listener, false, context, priority);

		context = context || this;
		listener.call(context);
	}

	public addOnce(listener: Function, context?: any, priority = 0)
	{
		this.registerListener(listener, true, context, priority);
	}

	protected registerListener(listener: Function, isOnce: boolean, context: any, priority: number = 0)
	{
		const prevIndex = this.indexOfListener(listener, context);
		let binding: IBinding | null = null;

		if (prevIndex !== -1)
		{
			binding = this._bindings[prevIndex];
			if (binding.isOnce !== isOnce)
			{
				throw new Error('You cannot add' + (isOnce ? '' : 'Once') + '() then add' + (!isOnce ? '' : 'Once') + '() the same listener without removing the relationship first.');
			}
		}
		else
		{
			binding = {
				listener: listener,
				context: context,
				isOnce: isOnce,
				priority: priority
			};

			this.addBinding(binding);
		}
	}

	protected addBinding(binding: IBinding)
	{
		let n = this._bindings.length;

		do
		{
			--n;
		}
		while (this._bindings[n] && binding.priority <= this._bindings[n].priority);

		this._bindings.splice(n + 1, 0, binding);
	}

	protected indexOfListener(listener: Function, context: any)
	{
		for (let i = this._bindings.length - 1; i >= 0; --i)
		{
			const binding = this._bindings[i];
			if (binding.listener === listener && binding.context === context)
			{
				return i;
			}
		}

		return -1;
	}

	public has()
	{

	}

	public halt()
	{
		this._shouldPropagate = false;
	}

	public remove(listener: Function, context?: any)
	{
		const i = this.indexOfListener(listener, context);

		if (i !== -1)
		{
			this._bindings.splice(i, 1);

			return true;
		}

		return false;
	}

	public removeAll()
	{
		this._bindings.length = 0;
	}

	public dispatch()
	{
		const paramsArr = Array.prototype.slice.call(arguments);
		this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

		const bindings = this._bindings;

		for (let i = bindings.length - 1; i >= 0; --i)
		{
			const result = bindings[i].listener.apply(bindings[i].context, paramsArr);

			if (result === false || !this._shouldPropagate)
			{
				break;
			}
		}
	}

	public dispose()
	{
		this.removeAll();
	}

	public get bindings()
	{
		return this._bindings;
	}
}