// Domínio orientado a objetos: os erros de negócio e o Evento.
import type { EventoInfo } from "./tipos.ts";

// ---------------------------------------------------------------- Erros

// Classe abstrata: ninguém lança um ErroDeNegocio "genérico", só as filhas.
// Cada erro guarda o próprio status HTTP, então o servidor não precisa de
// um if para cada tipo: basta ler erro.status.
export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
    this.name = new.target.name; // ex.: "PoltronaOcupadaErro"
  }
}

// Pedido ou poltrona inválidos.
export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

// O evento não existe.
export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

// A poltrona já foi vendida.
export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

// A operadora não aprovou o pagamento (ou demorou demais).
export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

// ---------------------------------------------------------------- Evento

export class Evento {
  readonly id: number;
  readonly nome: string;
  readonly preco: number;
  readonly capacidade: number;

  // Privado (#): só os métodos da classe mexem nas poltronas vendidas.
  // De fora, evento.#vendidas nem compila, e quem tentar só consegue ler
  // evento.disponivel.
  #vendidas: number[] = [];

  constructor(id: number, nome: string, preco: number, capacidade: number) {
    this.id = id;
    this.nome = nome;
    this.preco = preco;
    this.capacidade = capacidade;
  }

  // Só getter, sem setter: evento.disponivel = 999 não muda nada.
  get disponivel(): number {
    return this.capacidade - this.#vendidas.length;
  }

  // Tudo ou nada: primeiro confere TODAS as poltronas e só depois marca.
  // Se alguma der erro, a lista de vendidas fica exatamente como estava.
  reservar(poltronas: number[]): void {
    if (!Array.isArray(poltronas) || poltronas.length === 0) {
      throw new DadosInvalidosErro("informe pelo menos uma poltrona");
    }
    for (const poltrona of poltronas) {
      if (!Number.isInteger(poltrona) || poltrona < 1 || poltrona > this.capacidade) {
        throw new DadosInvalidosErro(`poltrona ${poltrona} não existe`);
      }
    }
    if (new Set(poltronas).size !== poltronas.length) {
      throw new DadosInvalidosErro("poltrona repetida no mesmo pedido");
    }
    for (const poltrona of poltronas) {
      if (this.#vendidas.includes(poltrona)) {
        throw new PoltronaOcupadaErro(`poltrona ${poltrona} já foi vendida`);
      }
    }

    // Tudo conferido: agora marca.
    this.#vendidas.push(...poltronas);
  }

  // Devolve poltronas para a venda (usado quando o pagamento falha).
  // Também é tudo ou nada: confere antes de liberar.
  liberar(poltronas: number[]): void {
    for (const poltrona of poltronas) {
      if (!this.#vendidas.includes(poltrona)) {
        throw new DadosInvalidosErro(`poltrona ${poltrona} não estava vendida`);
      }
    }
    this.#vendidas = this.#vendidas.filter((p) => !poltronas.includes(p));
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }
}
