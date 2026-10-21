import querystring from 'querystring';
import { count, is_null, is_object, range } from '@ostro/support/function';
import Collection from '@ostro/support/collection';
import { Macroable } from '@ostro/support/macro';

import type { IPaginator, ILengthAwarePaginator } from '@ostro/contracts/pagination/paginator';

/**
 * Abstract base class providing core pagination mechanics.
 *
 * @typeParam T - Type of items being paginated.
 */
class AbstractPaginator<T = unknown> extends Macroable implements IPaginator<T> {

	/**
	 * Collection of items being paginated.
	 */
	$items!: Collection<T>;

	/**
	 * Number of items to be shown per page.
	 */
	$perPage!: number;

	/**
	 * Current page number.
	 */
	$currentPage!: number;

	/**
	 * Base path for generated page URLs.
	 */
	$path: string = '/';

	/**
	 * Query string parameters to append to URLs.
	 */
	$query: Record<string, any> = {};

	/**
	 * URL fragment to append to URLs.
	 */
	$fragment?: string | null;

	/**
	 * Query string variable used to store the page number.
	 */
	$pageName: string = 'page';

	/**
	 * Number of page links to display on each side of the current page.
	 */
	$onEachSide: number = 3;

	/**
	 * Options dictionary passed to the paginator.
	 */
	$options?: Record<string, any>;

	/**
	 * Incoming HTTP request instance.
	 */
	$request?: any;

	/**
	 * Custom current path resolver callback.
	 */
	$currentPathResolver?: () => string;

	/**
	 * Custom current page resolver callback.
	 */
	$currentPageResolver?: () => number;

	/**
	 * Custom query string resolver callback.
	 */
	$queryStringResolver?: () => any;

	/**
	 * Resolver function for obtaining the view factory instance.
	 */
	static $viewFactoryResolver?: () => any;

	/**
	 * Default view name for standard pagination.
	 */
	static $defaultView: string = 'pagination::tailwind';

	/**
	 * Default view name for simple pagination.
	 */
	static $defaultSimpleView: string = 'pagination::simple-tailwind';

	hasMorePages(): boolean {
		return false;
	}

	render($view?: string | null, $data?: Record<string, any>): any {
		return '';
	}

	/**
	 * Determine if the given value is a valid page number.
	 *
	 * @param page - Page number to validate.
	 * @returns True if valid integer >= 1.
	 */
	isValidPageNumber($page: any): boolean {
		return $page >= 1 && Number.isInteger(parseInt($page, 10)) !== false;
	}

	/**
	 * Get the URL for the previous page.
	 *
	 * @returns Previous page URL, or undefined if on the first page.
	 */
	previousPageUrl(): string | undefined {
		if (this.currentPage() > 1) {
			return this.url(this.currentPage() - 1);
		}
	}

	/**
	 * Create a range of page URLs.
	 *
	 * @param start - Starting page number.
	 * @param end - Ending page number.
	 * @returns Dictionary of page numbers to URLs.
	 */
	getUrlRange($start: number, $end: number): Record<number, string> {
		return new Collection(range($start, $end)).mapWithKeys(($page: number) => {
			return [$page, this.url($page)];
		}).all() as Record<number, string>;
	}

	/**
	 * Get the URL for a given page number.
	 *
	 * @param page - Page number.
	 * @returns Formatted URL.
	 */
	url($page: number): string {
		if ($page <= 0) {
			$page = 1;
		}

		const $parameters: Record<string, any> = { [this.$pageName]: $page };

		if (count(this.$query) > 0) {
			Object.assign($parameters, this.$query);
		}

		return this.path()
			+ (this.path().includes('?') ? '&' : '?')
			+ querystring.stringify($parameters)
			+ this.buildFragment();
	}

	/**
	 * Get or set the URL fragment.
	 *
	 * @param fragment - Optional fragment anchor.
	 * @returns Fragment string, or self for chaining.
	 */
	fragment($fragment: string | null = null): this | string | null | undefined {
		if (is_null($fragment)) {
			return this.$fragment;
		}

		this.$fragment = $fragment;

		return this;
	}

	/**
	 * Add a set of query string values to the paginator.
	 *
	 * @param key - Query parameter key or key-value object.
	 * @param value - Query parameter value.
	 * @returns Fluent self instance.
	 */
	appends($key: any, $value: any = null): this {
		if (is_null($key)) {
			return this;
		}

		if (is_object($key)) {
			return this.appendObject($key);
		}

		return this.addQuery($key, $value);
	}

	/**
	 * Add an array of query string values.
	 *
	 * @param keys - Dictionary of query parameters.
	 * @returns Fluent self instance.
	 */
	appendObject($keys: Record<string, any> = {}): this {
		for (const key in $keys) {
			this.addQuery(key, $keys[key]);
		}

		return this;
	}

	/**
	 * Add all current query string values to the paginator.
	 *
	 * @returns Fluent self instance.
	 */
	withQueryString(): this {
		return this.appends(this.resolveQueryString());
	}

	/**
	 * Add a query string value to the paginator.
	 *
	 * @param key - Query parameter key.
	 * @param value - Query parameter value.
	 * @returns Fluent self instance.
	 */
	addQuery($key: string, $value: any): this {
		if ($key !== this.$pageName) {
			this.$query[$key] = $value;
		}

		return this;
	}

	/**
	 * Build the full fragment portion of a URL.
	 *
	 * @returns Formatted fragment with '#' or empty string.
	 */
	buildFragment(): string {
		return this.$fragment ? '#' + this.$fragment : '';
	}

	/**
	 * Load a set of relationships onto the mixed relationship models.
	 *
	 * @param relation - Relationship name.
	 * @param relations - Dictionary of relations to load.
	 * @returns Fluent self instance.
	 */
	loadMorph($relation: any, $relations: any): this {
		(this.getCollection() as any).loadMorph($relation, $relations);

		return this;
	}

	/**
	 * Load a count of relationships onto the mixed relationship models.
	 *
	 * @param relation - Relationship name.
	 * @param relations - Dictionary of relations to load counts for.
	 * @returns Fluent self instance.
	 */
	loadMorphCount($relation: any, $relations: any): this {
		(this.getCollection() as any).loadMorphCount($relation, $relations);

		return this;
	}

	/**
	 * Get the slice of items being paginated.
	 *
	 * @returns Array of paginated items.
	 */
	items(): T[] {
		return this.$items.all();
	}

	/**
	 * Get the number of the first item in the slice.
	 *
	 * @returns First item number or null.
	 */
	firstItem(): number | null {
		return this.count() > 0 ? (this.$currentPage - 1) * this.$perPage + 1 : null;
	}

	/**
	 * Get the number of the last item in the slice.
	 *
	 * @returns Last item number or null.
	 */
	lastItem(): number | null {
		return this.count() > 0 ? this.firstItem()! + this.count() - 1 : null;
	}

	/**
	 * Transform each item in the slice of items using a callback.
	 *
	 * @param callback - Transformation callback.
	 * @returns Fluent self instance.
	 */
	through($callback: (item: T, key?: any) => any): this {
		this.$items = this.$items.map($callback);

		return this;
	}

	/**
	 * Get the number of items shown per page.
	 *
	 * @returns Per-page count.
	 */
	perPage(): number {
		return this.$perPage;
	}

	/**
	 * Determine if there are enough items to split into multiple pages.
	 *
	 * @returns True if multiple pages exist.
	 */
	hasPages(): boolean {
		return this.currentPage() != 1 || this.hasMorePages();
	}

	/**
	 * Determine if the paginator is on the first page.
	 *
	 * @returns True if on first page.
	 */
	onFirstPage(): boolean {
		return this.currentPage() <= 1;
	}

	/**
	 * Determine if the paginator is on the last page.
	 *
	 * @returns True if on last page.
	 */
	onLastPage(): boolean {
		return !this.hasMorePages();
	}

	/**
	 * Get the current page.
	 *
	 * @returns Current page number.
	 */
	currentPage(): number {
		return this.$currentPage;
	}

	/**
	 * Get the query string variable used to store the page.
	 *
	 * @returns Page query parameter name.
	 */
	getPageName(): string {
		return this.$pageName;
	}

	/**
	 * Set the query string variable used to store the page.
	 *
	 * @param name - Page query parameter name.
	 * @returns Fluent self instance.
	 */
	setPageName($name: string): this {
		this.$pageName = $name;

		return this;
	}

	/**
	 * Set the base path for incoming request URIs.
	 *
	 * @param path - Base path.
	 * @returns Fluent self instance.
	 */
	withPath($path: string): this {
		return this.setPath($path);
	}

	/**
	 * Set the base path for incoming request URIs.
	 *
	 * @param path - Base path.
	 * @returns Fluent self instance.
	 */
	setPath($path: string): this {
		this.$path = $path;

		return this;
	}

	/**
	 * Set the number of links to display on each side of current page link.
	 *
	 * @param count - Link count.
	 * @returns Fluent self instance.
	 */
	onEachSide($count: number): this {
		this.$onEachSide = $count;

		return this;
	}

	/**
	 * Get the base path for incoming request URIs.
	 *
	 * @returns Base path.
	 */
	path(): string {
		return this.$path;
	}

	/**
	 * Resolve the current request path or return default.
	 *
	 * @param defaultPath - Default fallback path.
	 * @returns Resolved path.
	 */
	resolveCurrentPath($default: string = '/'): string {
		if (!this.$request) return $default;
		if (typeof this.$request.url === 'function') return this.$request.url();
		if (typeof this.$request.url === 'string') return this.$request.url;
		if (typeof this.$request.path === 'function') return this.$request.path();
		return $default;
	}

	/**
	 * Resolve the current page or return the default value.
	 *
	 * @param pageName - Page parameter name.
	 * @param defaultPage - Fallback page number.
	 * @returns Resolved page number.
	 */
	resolveCurrentPage($pageName: string = 'page', $default: number = 1): number {
		const page = (this.$request && typeof this.$request.input === 'function') ? this.$request.input($pageName) : null;
		const parsedPage = parseInt(page, 10);
		if (!isNaN(parsedPage) && Number.isInteger(parsedPage) && parsedPage >= 1) {
			return parsedPage;
		}
		return $default;
	}

	/**
	 * Resolve the query string or return the default value.
	 *
	 * @param defaultQuery - Fallback query string/object.
	 * @returns Resolved query string/object.
	 */
	resolveQueryString($default: any = null): any {
		return (this.$request && typeof this.$request.getQuery === 'function') ? this.$request.getQuery() : $default;
	}

	/**
	 * Get the view factory instance.
	 *
	 * @returns View factory instance.
	 */
	viewFactory(): any {
		return (this.constructor as typeof AbstractPaginator).viewFactory();
	}

	/**
	 * Get the default view name.
	 */
	get $defaultView(): string {
		return (this.constructor as typeof AbstractPaginator).$defaultView;
	}

	/**
	 * Get the default simple view name.
	 */
	get $defaultSimpleView(): string {
		return (this.constructor as typeof AbstractPaginator).$defaultSimpleView;
	}

	/**
	 * Get the view factory instance from resolver.
	 *
	 * @returns Resolved view factory.
	 */
	static viewFactory(): any {
		return (this.$viewFactoryResolver as Function)();
	}

	/**
	 * Set a callback to provide the view factory.
	 *
	 * @param resolver - Factory resolver function.
	 */
	static viewFactoryResolver($resolver: any): void {
		this.$viewFactoryResolver = $resolver;
	}

	/**
	 * Set the default pagination view.
	 *
	 * @param view - View name.
	 */
	static defaultView($view: string): void {
		this.$defaultView = $view;
	}

	/**
	 * Set the default simple pagination view.
	 *
	 * @param view - View name.
	 */
	static defaultSimpleView($view: string): void {
		this.$defaultSimpleView = $view;
	}

	/**
	 * Indicate that Tailwind styling should be used for generated links.
	 */
	static useTailwind(): void {
		this.defaultView('pagination::tailwind');
		this.defaultSimpleView('pagination::simple-tailwind');
	}

	/**
	 * Indicate that Bootstrap styling should be used for generated links.
	 */
	static useBootstrap(): void {
		this.useBootstrapFour();
	}

	/**
	 * Indicate that Bootstrap 3 styling should be used for generated links.
	 */
	static useBootstrapThree(): void {
		this.defaultView('pagination::default');
		this.defaultSimpleView('pagination::simple-default');
	}

	/**
	 * Indicate that Bootstrap 4 styling should be used for generated links.
	 */
	static useBootstrapFour(): void {
		this.defaultView('pagination::bootstrap-4');
		this.defaultSimpleView('pagination::simple-bootstrap-4');
	}

	/**
	 * Indicate that Bootstrap 5 styling should be used for generated links.
	 */
	static useBootstrapFive(): void {
		this.defaultView('pagination::bootstrap-5');
		this.defaultSimpleView('pagination::simple-bootstrap-5');
	}

	/**
	 * Get an iterator for the items.
	 *
	 * @returns Iterator.
	 */
	getIterator(): Iterator<T> {
		return typeof (this.$items as any).getIterator === 'function'
			? (this.$items as any).getIterator()
			: (this.$items as any)[Symbol.iterator]();
	}

	/**
	 * Determine if the list of items is empty.
	 *
	 * @returns True if empty.
	 */
	isEmpty(): boolean {
		return this.count() === 0;
	}

	/**
	 * Determine if the list of items is not empty.
	 *
	 * @returns True if not empty.
	 */
	isNotEmpty(): boolean {
		return this.count() > 0;
	}

	/**
	 * Get the number of items for the current page.
	 *
	 * @returns Item count.
	 */
	count(): number {
		return this.$items.count();
	}

	/**
	 * Get the paginator's underlying collection.
	 *
	 * @returns Collection instance.
	 */
	getCollection(): Collection<T> {
		return this.$items;
	}

	/**
	 * Set the paginator's underlying collection.
	 *
	 * @param collection - Collection instance.
	 * @returns Fluent self instance.
	 */
	setCollection($collection: Collection<T>): this {
		this.$items = $collection;

		return this;
	}

	/**
	 * Get the paginator options.
	 *
	 * @returns Options dictionary.
	 */
	getOptions(): Record<string, any> | undefined {
		return this.$options;
	}

	/**
	 * Determine if the given item exists.
	 *
	 * @param key - Item key.
	 * @returns True if key exists.
	 */
	offsetExists($key: any): boolean {
		return (this.$items as any).has($key);
	}

	/**
	 * Get the item at the given offset.
	 *
	 * @param key - Item key.
	 * @returns Item value.
	 */
	offsetGet($key: any): any {
		const val = (this.$items as any).get($key);
		return (val && typeof val.all === 'function') ? val.all() : val;
	}

	/**
	 * Set the item at the given offset.
	 *
	 * @param key - Item key.
	 * @param value - Item value.
	 */
	offsetSet($key: any, $value: any): void {
		(this.$items as any).put($key, $value);
	}

	/**
	 * Unset the item at the given offset.
	 *
	 * @param key - Item key.
	 */
	offsetUnset($key: any): void {
		if (Array.isArray((this.$items as any).$items)) {
			(this.$items as any).$items.splice($key, 1);
		} else {
			delete (this.$items as any)[$key];
		}
	}

	/**
	 * Render the contents of the paginator to HTML.
	 *
	 * @returns Rendered HTML string.
	 */
	toHtml(): string {
		return String(this.render());
	}

	/**
	 * Dynamically handle calls into the paginator instance.
	 *
	 * @param target - Target instance.
	 * @param method - Method name.
	 * @param parameters - Method arguments.
	 * @returns Call result.
	 */
	__call($target: any, $method: string, $parameters: any[]): any {
		return $target.getCollection()[$method](...$parameters);
	}

	/**
	 * Render the contents of the paginator when evaluated as a string.
	 *
	 * @returns Rendered string.
	 */
	__toString(): string {
		return String(this.render());
	}
}

export type { IPaginator, ILengthAwarePaginator };
export default AbstractPaginator;
