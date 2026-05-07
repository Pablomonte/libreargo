export class HubApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HubApiError";
  }
}

export class HubApiNetworkError extends HubApiError {
  constructor(message = "No se pudo conectar con el hub") {
    super(message);
    this.name = "HubApiNetworkError";
  }
}

export class HubApiTimeoutError extends HubApiNetworkError {
  constructor(message = "El hub tardó demasiado en responder") {
    super(message);
    this.name = "HubApiTimeoutError";
  }
}

export class HubApiInvalidResponseError extends HubApiError {
  constructor(message = "El hub respondió con datos inválidos") {
    super(message);
    this.name = "HubApiInvalidResponseError";
  }
}

export class HubApiToggleError extends HubApiError {
  constructor(message = "No se pudo ejecutar la acción sobre el relé") {
    super(message);
    this.name = "HubApiToggleError";
  }
}
