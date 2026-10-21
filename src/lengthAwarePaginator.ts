import AbstractPaginator, { type ILengthAwarePaginator } from './abstractPaginator';
import Collection from '@ostro/support/collection';
import UrlWindow from './urlWindow';
import { is_object, rtrim } from '@ostro/support/function';

/**
 * LengthAwarePaginator providing full pagination info with total count and page range calculations.
 *
 * @typeParam T - Type of items being paginated.
 */
class LengthAwarePaginator<T = unknown> extends AbstractPaginator<T> implements ILengthAwarePaginator<T> {

	/**
	 * Total number of items in the data source.
	 */
	$total: number;

	/**
	 * Last available page number.
	 */
	$lastPage: number;

	/**
	 * Create a new length-aware paginator instance.
	 *
	 * @param items - Paginated items array or Collection.
	 * @param total - Total item count.
	 * @param perPage - Items per page.
	 * @param currentPage - Current page number.
	 * @param options - Paginator options.
	 * @param request - Request instance.
	 */
	constructor(
		$items: any[] | Collection<T>,
		$total: number,
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

		this.$total = $total;
		this.$perPage = parseInt($perPage as any, 10);
		this.$lastPage = Math.max(parseInt(Math.ceil($total / $perPage) as any, 10), 1);
		this.$path = this.$path !== '/' ? rtrim(this.$path, '/') : this.$path;
		this.$currentPage = this.setCurrentPage($currentPage, this.$pageName);
		this.$items = $items instanceof Collection ? $items : Collection.make($items);
	}

	/**
	 * Set the current page.
	 *
	 * @param currentPage - Current page number or null.
	 * @param pageName - Page parameter name.
	 * @returns Validated page number.
	 */
	setCurrentPage($currentPage: any, $pageName: string): number {
		$currentPage = $currentPage || this.resolveCurrentPage($pageName);

		return this.isValidPageNumber($currentPage) ? parseInt($currentPage, 10) : 1;
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
		return this.viewFactory().make($view || this.$defaultView, Object.assign($data, {
			'paginator': this,
			'elements': this.elements(),
		}));
	}

	/**
	 * Get the array of elements to be represented on the pager.
	 *
	 * @returns Collection of link objects.
	 */
	linkCollection(): Collection<Record<string, any>> {
		return new Collection(this.elements()).flatMap(($item: any) => {
			if (typeof ($item) != 'object') {
				return [{ 'url': null, 'label': '...', 'active': false }];
			}
			const pages: any[] = [];
			for (let $page in $item) {
				const pageNum: number = parseInt($page, 10);
				pages.push({
					'url': $item[$page],
					'label': String(pageNum),
					'active': this.currentPage() === pageNum,
				});
			}
			return pages;
		}).prepend({
			'url': this.previousPageUrl(),
			'label': 'Previous',
			'active': false,
		}).push({
			'url': this.nextPageUrl(),
			'label': 'Next',
			'active': false,
		}) as Collection<Record<string, any>>;
	}

	/**
	 * Get the array of elements to be represented on the pager.
	 *
	 * @returns Array of page URL ranges and dividers.
	 */
	elements(): any[] {
		const window = UrlWindow.make(this);

		return [
			window.first,
			window.slider && is_object(window.slider) ? '...' : null,
			window.last,
		].filter(element => element !== null);
	}

	/**
	 * Get the total number of items being paginated.
	 *
	 * @returns Total count.
	 */
	total(): number {
		return this.$total;
	}

	/**
	 * Determine if there are more items in the data source.
	 *
	 * @returns True if more pages exist.
	 */
	hasMorePages(): boolean {
		return this.currentPage() < this.lastPage();
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
	 * Get the last page number.
	 *
	 * @returns Last page number.
	 */
	lastPage(): number {
		return this.$lastPage;
	}

	/**
	 * Convert the object into something JSON serializable.
	 *
	 * @returns Serialized paginator object.
	 */
	toJSON(): Record<string, any> {
		return this.toJson();
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
			'last_page': this.lastPage(),
			'last_page_url': this.url(this.lastPage()),
			'links': this.linkCollection().toArray(),
			'next_page_url': this.nextPageUrl(),
			'path': this.path(),
			'per_page': this.perPage(),
			'prev_page_url': this.previousPageUrl(),
			'to': this.lastItem(),
			'total': this.total(),
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

export default LengthAwarePaginator;
