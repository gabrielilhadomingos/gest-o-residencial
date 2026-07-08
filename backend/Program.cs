using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "Frontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "https://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AvaliaDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=Data/avalia.db";

    options.UseSqlite(connectionString);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AvaliaDbContext>();
    Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "Data"));
    db.Database.EnsureCreated();
}

app.UseCors(FrontendCorsPolicy);
app.UseHttpsRedirection();

var people = app.MapGroup("/api/people");

people.MapGet("/", async (AvaliaDbContext db) =>
{
    var result = await db.Pessoas
        .AsNoTracking()
        .OrderBy(pessoa => pessoa.Nome)
        .Select(pessoa => PessoaResponse.FromEntity(pessoa))
        .ToListAsync();

    return Results.Ok(result);
});

people.MapGet("/{id:guid}", async (Guid id, AvaliaDbContext db) =>
{
    var pessoa = await db.Pessoas.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
    return pessoa is null ? Results.NotFound() : Results.Ok(PessoaResponse.FromEntity(pessoa));
});

people.MapPost("/", async (PessoaRequest request, AvaliaDbContext db) =>
{
    var validationError = ValidatePessoa(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var pessoa = new Pessoa
    {
        Id = Guid.NewGuid(),
        Nome = request.Name.Trim(),
        Idade = request.Age
    };

    db.Pessoas.Add(pessoa);
    await db.SaveChangesAsync();

    return Results.Created($"/api/people/{pessoa.Id}", PessoaResponse.FromEntity(pessoa));
});

people.MapPut("/{id:guid}", async (Guid id, PessoaRequest request, AvaliaDbContext db) =>
{
    var validationError = ValidatePessoa(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var pessoa = await db.Pessoas.FirstOrDefaultAsync(item => item.Id == id);
    if (pessoa is null)
    {
        return Results.NotFound();
    }

    pessoa.Nome = request.Name.Trim();
    pessoa.Idade = request.Age;

    await db.SaveChangesAsync();

    return Results.Ok(PessoaResponse.FromEntity(pessoa));
});

people.MapDelete("/{id:guid}", async (Guid id, AvaliaDbContext db) =>
{
    var pessoa = await db.Pessoas.FirstOrDefaultAsync(item => item.Id == id);
    if (pessoa is null)
    {
        return Results.NotFound();
    }

    db.Pessoas.Remove(pessoa);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

var transactions = app.MapGroup("/api/transactions");

transactions.MapGet("/", async (AvaliaDbContext db) =>
{
    var result = await db.Transacoes
        .AsNoTracking()
        .Include(transacao => transacao.Pessoa)
        .OrderBy(transacao => transacao.Descricao)
        .Select(transacao => TransacaoResponse.FromEntity(transacao))
        .ToListAsync();

    return Results.Ok(result);
});

transactions.MapPost("/", async (TransacaoRequest request, AvaliaDbContext db) =>
{
    var validationError = ValidateTransacao(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var pessoa = await db.Pessoas.FirstOrDefaultAsync(item => item.Id == request.PessoaId);
    if (pessoa is null)
    {
        return Results.BadRequest(new { message = "A pessoa informada nao existe." });
    }

    var tipo = NormalizeTipo(request.Tipo);
    if (pessoa.Idade < 18 && tipo == TransactionTypes.Receita)
    {
        return Results.BadRequest(new { message = "Pessoas menores de 18 anos nao podem cadastrar receitas." });
    }

    var transacao = new Transacao
    {
        Id = Guid.NewGuid(),
        Descricao = request.Descricao.Trim(),
        Valor = request.Valor,
        Tipo = tipo,
        PessoaId = request.PessoaId,
        Pessoa = pessoa
    };

    db.Transacoes.Add(transacao);
    await db.SaveChangesAsync();

    return Results.Created($"/api/transactions/{transacao.Id}", TransacaoResponse.FromEntity(transacao));
});

app.MapGet("/api/totals", async (AvaliaDbContext db) =>
{
    var pessoas = await db.Pessoas
        .AsNoTracking()
        .Include(pessoa => pessoa.Transacoes)
        .OrderBy(pessoa => pessoa.Nome)
        .ToListAsync();

    var peopleTotals = pessoas
        .Select(pessoa =>
        {
            var totalReceitas = pessoa.Transacoes
                .Where(transacao => transacao.Tipo == TransactionTypes.Receita)
                .Sum(transacao => transacao.Valor);
            var totalDespesas = pessoa.Transacoes
                .Where(transacao => transacao.Tipo == TransactionTypes.Despesa)
                .Sum(transacao => transacao.Valor);

            return new PessoaTotalResponse(
                pessoa.Id,
                pessoa.Nome,
                totalReceitas,
                totalDespesas,
                totalReceitas - totalDespesas
            );
        })
        .ToList();

    var totalReceitasGeral = peopleTotals.Sum(total => total.TotalReceitas);
    var totalDespesasGeral = peopleTotals.Sum(total => total.TotalDespesas);

    return Results.Ok(new TotaisResponse(
        peopleTotals,
        new TotalGeralResponse(
            totalReceitasGeral,
            totalDespesasGeral,
            totalReceitasGeral - totalDespesasGeral
        )
    ));
});

app.Run();

static string? ValidatePessoa(PessoaRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return "O nome da pessoa e obrigatorio.";
    }

    if (request.Age < 0 || request.Age > 130)
    {
        return "Informe uma idade valida.";
    }

    return null;
}

static string? ValidateTransacao(TransacaoRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Descricao))
    {
        return "A descricao da transacao e obrigatoria.";
    }

    if (request.Valor <= 0)
    {
        return "O valor da transacao deve ser maior que zero.";
    }

    if (request.PessoaId == Guid.Empty)
    {
        return "Informe uma pessoa valida.";
    }

    var tipo = NormalizeTipo(request.Tipo);
    if (tipo is not (TransactionTypes.Despesa or TransactionTypes.Receita))
    {
        return "O tipo da transacao deve ser despesa ou receita.";
    }

    return null;
}

static string NormalizeTipo(string? tipo)
{
    return tipo?.Trim().ToLowerInvariant() ?? string.Empty;
}

public sealed class AvaliaDbContext(DbContextOptions<AvaliaDbContext> options) : DbContext(options)
{
    public DbSet<Pessoa> Pessoas => Set<Pessoa>();
    public DbSet<Transacao> Transacoes => Set<Transacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pessoa>(entity =>
        {
            entity.ToTable("Pessoas");
            entity.HasKey(pessoa => pessoa.Id);
            entity.Property(pessoa => pessoa.Nome).HasMaxLength(120).IsRequired();
            entity.Property(pessoa => pessoa.Idade).IsRequired();

            entity
                .HasMany(pessoa => pessoa.Transacoes)
                .WithOne(transacao => transacao.Pessoa)
                .HasForeignKey(transacao => transacao.PessoaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Transacao>(entity =>
        {
            entity.ToTable("Transacoes");
            entity.HasKey(transacao => transacao.Id);
            entity.Property(transacao => transacao.Descricao).HasMaxLength(180).IsRequired();
            entity.Property(transacao => transacao.Valor).HasColumnType("decimal(18,2)").IsRequired();
            entity.Property(transacao => transacao.Tipo).HasMaxLength(20).IsRequired();
            entity.Property(transacao => transacao.PessoaId).IsRequired();
        });
    }
}

public sealed class Pessoa
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int Idade { get; set; }
    public ICollection<Transacao> Transacoes { get; set; } = [];
}

public sealed class Transacao
{
    public Guid Id { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public Guid PessoaId { get; set; }
    public Pessoa? Pessoa { get; set; }
}

public sealed record PessoaRequest(string Name, int Age);

public sealed record TransacaoRequest(string Descricao, decimal Valor, string Tipo, Guid PessoaId);

public sealed record PessoaResponse(
    Guid Id,
    string Name,
    int Age,
    bool CanRegisterExpense,
    bool CanRegisterIncome
)
{
    public static PessoaResponse FromEntity(Pessoa pessoa)
    {
        return new PessoaResponse(
            pessoa.Id,
            pessoa.Nome,
            pessoa.Idade,
            CanRegisterExpense: true,
            CanRegisterIncome: pessoa.Idade >= 18
        );
    }
}

public sealed record TransacaoResponse(
    Guid Id,
    string Descricao,
    decimal Valor,
    string Tipo,
    Guid PessoaId,
    string PessoaNome
)
{
    public static TransacaoResponse FromEntity(Transacao transacao)
    {
        return new TransacaoResponse(
            transacao.Id,
            transacao.Descricao,
            transacao.Valor,
            transacao.Tipo,
            transacao.PessoaId,
            transacao.Pessoa?.Nome ?? string.Empty
        );
    }
}

public sealed record PessoaTotalResponse(
    Guid PessoaId,
    string PessoaNome,
    decimal TotalReceitas,
    decimal TotalDespesas,
    decimal Saldo
);

public sealed record TotalGeralResponse(
    decimal TotalReceitas,
    decimal TotalDespesas,
    decimal SaldoLiquido
);

public sealed record TotaisResponse(
    IReadOnlyCollection<PessoaTotalResponse> Pessoas,
    TotalGeralResponse TotalGeral
);

public static class TransactionTypes
{
    public const string Despesa = "despesa";
    public const string Receita = "receita";
}
