import AbstractPaginator from './abstractPaginator';
import Collection from '@ostro/support/collection';
import { rtrim } from '@ostro/support/function';

/**
 * Simple paginator that does not require a total item count query.
 *
 * @typeParam T - Type of items being paginated.
 */
class Paginator<T = unknown> extends AbstractPaginator<T> {

	/**
	 * Indicates whether more items exist beyond current page.
	 */
	$hasMore!: boolean;

	/**
	 * Create a new simple paginator instance.
	 *
	 * @param items - Paginated items array or Collection.
	 * @param perPage - Items per page.
	 * @param currentPage - Current page number.
	 * @param options - Paginator options.
	 * @param request - Request instance.
	 */
	constructor(
		$items: any[] | Collection<T>,
		$perPage: number,
		$currentPage: any = null,
		$options: Record<string, any> = {},
		$request: Record<string, any> = {}
	) {
		super();
		this.$options = $options;
		this.$request = $request;
		for (const $key in $options) {
			(this as any)[$key] = $options[$key];
		}

		this.$perPage = $perPage;
		this.$currentPage = this.setCurrentPage($currentPage);
		this.$path = this.$path !== '/' ? rtrim(this.$path, '/') : this.$path;

		this.setItems($items);
	}

	/**
	 * Set the current page.
	 *
	 * @param currentPage - Current page number or null.
	 * @returns Validated page number.
	 */
	setCurrentPage($currentPage: any): number {
		$currentPage = $currentPage || this.resolveCurrentPage();

		return this.isValidPageNumber($currentPage) ? parseInt($currentPage, 10) : 1;
	}

	/**
	 * Set the items for the paginator, determining whether there are more items.
	 *
	 * @param items - Items array or Collection.
	 */
	setItems($items: any[] | Collection<T>): void {
		this.$items = $items instanceof Collection ? $items : Collection.make($items);

		this.$hasMore = this.$items.count() > this.$perPage;

		this.$items = this.$items.slice(0, this.$perPage);
	}

	/**
	 * Get the URL for the next page.
	 *
	 * @returns Next page URL or undefined.
	 */
	nextPageUrl(): string | undefined {
		if (this.hasMorePages()) {
			return this.url(this.currentPage() + 1);
		}
	}

	/**
	 * Get the next page number.
	 *
	 * @returns Next page number or undefined.
	 */
	nextPage(): number | undefined {
		if (this.hasMorePages()) {
			return this.currentPage() + 1;
		}
	}

	/**
	 * Render the paginator using the given view.
	 *
	 * @param view - View template name.
	 * @param data - View context data.
	 * @returns Rendered view.
	 */
	links($view: string | null = null, $data: Record<string, any> = {}): any {
		return this.render($view, $data);
	}

	/**
	 * Render the paginator using the given view.
	 *
	 * @param view - View template name.
	 * @param data - View context data.
	 * @returns Rendered view.
	 */
	render($view: string | null = null, $data: Record<string, any> = {}): any {
		return this.viewFactory().make($view || this.$defaultSimpleView, Object.assign($data, {
			'paginator': this,
		}));
	}

	/**
	 * Manually indicate that there are more pages.
	 *
	 * @param hasMore - Whether more pages exist.
	 * @returns Fluent self instance.
	 */
	hasMorePagesWhen($hasMore: boolean = true): this {
		this.$hasMore = $hasMore;

		return this;
	}

	/**
	 * Determine if there are more items in the data source.
	 *
	 * @returns True if more pages exist.
	 */
	hasMorePages(): boolean {
		return this.$hasMore;
	}

	/**
	 * Get the instance as an array/JSON dictionary.
	 *
	 * @returns Serialized paginator dictionary.
	 */
	toJson(): Record<string, any> {
		return {
			'current_page': this.currentPage(),
			'data': this.$items.toArray(),
			'first_page_url': this.url(1),
			'from': this.firstItem(),
			'next_page_url': this.nextPageUrl(),
			'path': this.path(),
			'per_page': this.perPage(),
			'prev_page_url': this.previousPageUrl(),
			'to': this.lastItem(),
		};
	}

	/**
	 * Convert the object into something JSON serializable.
	 *
	 * @returns Serialized paginator dictionary.
	 */
	jsonSerialize(): Record<string, any> {
		return this.toJson();
	}
}

export default Paginator;
