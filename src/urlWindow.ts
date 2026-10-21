/**
 * Window slider calculation utility for rendering pagination links.
 */
class UrlWindow {

	/**
	 * Paginator instance.
	 */
	$paginator: any;

	/**
	 * Create a new URL window instance.
	 *
	 * @param paginator - Paginator instance.
	 */
	constructor($paginator: any) {
		this.$paginator = $paginator;
	}

	/**
	 * Create a new slider for the paginator.
	 *
	 * @param paginator - Paginator instance.
	 * @returns Generated slider windows.
	 */
	static make($paginator: any): Record<string, any> {
		return (new this($paginator)).get();
	}

	/**
	 * Get the window of URLs to be shown.
	 *
	 * @returns Slider window dictionary.
	 */
	get(): Record<string, any> {
		const $onEachSide: number = this.$paginator.$onEachSide;

		if (this.$paginator.lastPage() < ($onEachSide * 2) + 8) {
			return this.getSmallSlider();
		}

		return this.getUrlSlider($onEachSide);
	}

	/**
	 * Get the slider of URLs there are too not enough pages to slide.
	 *
	 * @returns Slider dictionary.
	 */
	getSmallSlider(): Record<string, any> {
		return {
			'first': this.$paginator.getUrlRange(1, this.lastPage()),
			'slider': null,
			'last': null,
		};
	}

	/**
	 * Create a URL slider.
	 *
	 * @param onEachSide - Links to show on each side.
	 * @returns Slider window dictionary.
	 */
	getUrlSlider($onEachSide: number): Record<string, any> {
		const $window: number = $onEachSide + 4;

		if (!this.hasPages()) {
			return { 'first': null, 'slider': null, 'last': null };
		}

		if (this.currentPage() <= $window) {
			return this.getSliderTooCloseToBeginning($window, $onEachSide);
		} else if (this.currentPage() > (this.lastPage() - $window)) {
			return this.getSliderTooCloseToEnding($window, $onEachSide);
		}

		return this.getFullSlider($onEachSide);
	}

	/**
	 * Get the slider of URLs when too close to the beginning of window.
	 *
	 * @param window - Window boundary.
	 * @param onEachSide - Links to show on each side.
	 * @returns Slider dictionary.
	 */
	getSliderTooCloseToBeginning($window: number, $onEachSide: number): Record<string, any> {
		return {
			'first': this.$paginator.getUrlRange(1, $window + $onEachSide),
			'slider': null,
			'last': this.getFinish(),
		};
	}

	/**
	 * Get the slider of URLs when too close to the ending of window.
	 *
	 * @param window - Window boundary.
	 * @param onEachSide - Links to show on each side.
	 * @returns Slider dictionary.
	 */
	getSliderTooCloseToEnding($window: number, $onEachSide: number): Record<string, any> {
		const $last: Record<number, string> = this.$paginator.getUrlRange(
			this.lastPage() - ($window + ($onEachSide - 1)),
			this.lastPage()
		);

		return {
			'first': this.getStart(),
			'slider': null,
			'last': $last,
		};
	}

	/**
	 * Get the slider of URLs when in middle of the window.
	 *
	 * @param onEachSide - Links to show on each side.
	 * @returns Slider dictionary.
	 */
	getFullSlider($onEachSide: number): Record<string, any> {
		return {
			'first': this.getStart(),
			'slider': this.getAdjacentUrlRange($onEachSide),
			'last': this.getFinish(),
		};
	}

	/**
	 * Get the page range for the current page window.
	 *
	 * @param onEachSide - Links to show on each side.
	 * @returns Dictionary of page numbers to URLs.
	 */
	getAdjacentUrlRange($onEachSide: number): Record<number, string> {
		return this.$paginator.getUrlRange(
			this.currentPage() - $onEachSide,
			this.currentPage() + $onEachSide
		);
	}

	/**
	 * Get the starting URLs of a pagination slider.
	 *
	 * @returns Starting page URLs.
	 */
	getStart(): Record<number, string> {
		return this.$paginator.getUrlRange(1, 2);
	}

	/**
	 * Get the ending URLs of a pagination slider.
	 *
	 * @returns Ending page URLs.
	 */
	getFinish(): Record<number, string> {
		return this.$paginator.getUrlRange(
			this.lastPage() - 1,
			this.lastPage()
		);
	}

	/**
	 * Determine if the underlying paginator being presented has pages to show.
	 *
	 * @returns True if more than 1 page.
	 */
	hasPages(): boolean {
		return this.$paginator.lastPage() > 1;
	}

	/**
	 * Get the current page from the paginator.
	 *
	 * @returns Current page number.
	 */
	currentPage(): number {
		return this.$paginator.currentPage();
	}

	/**
	 * Get the last page from the paginator.
	 *
	 * @returns Last page number.
	 */
	lastPage(): number {
		return this.$paginator.lastPage();
	}
}

export default UrlWindow;