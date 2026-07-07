using System.Collections.Concurrent;

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

builder.Services.AddSingleton<PeopleStore>();

var app = builder.Build();

app.UseCors(FrontendCorsPolicy);
app.UseHttpsRedirection();

var people = app.MapGroup("/api/people");

people.MapGet("/", (PeopleStore store) =>
{
    return Results.Ok(store.GetAll());
});

people.MapGet("/{id:guid}", (Guid id, PeopleStore store) =>
{
    var person = store.GetById(id);
    return person is null ? Results.NotFound() : Results.Ok(person);
});

people.MapPost("/", (PersonRequest request, PeopleStore store) =>
{
    var validationError = Validate(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var person = store.Create(request);
    return Results.Created($"/api/people/{person.Id}", person);
});

people.MapPut("/{id:guid}", (Guid id, PersonRequest request, PeopleStore store) =>
{
    var validationError = Validate(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var person = store.Update(id, request);
    return person is null ? Results.NotFound() : Results.Ok(person);
});

people.MapDelete("/{id:guid}", (Guid id, PeopleStore store) =>
{
    return store.Delete(id) ? Results.NoContent() : Results.NotFound();
});

app.Run();

static string? Validate(PersonRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return "O nome da pessoa e obrigatorio.";
    }

    if (!string.IsNullOrWhiteSpace(request.Email) && !request.Email.Contains('@', StringComparison.Ordinal))
    {
        return "Informe um e-mail valido.";
    }

    if (request.Age < 0 || request.Age > 130)
    {
        return "Informe uma idade valida.";
    }

    return null;
}

public sealed record Person(
    Guid Id,
    string Name,
    int Age,
    string? Email,
    string? Phone,
    DateTime CreatedAt
)
{
    public bool CanRegisterExpense => true;
    public bool CanRegisterIncome => Age >= 18;
}

public sealed record PersonRequest(
    string Name,
    int Age,
    string? Email,
    string? Phone
);

public sealed class PeopleStore
{
    private readonly ConcurrentDictionary<Guid, Person> _people = new();

    public IEnumerable<Person> GetAll()
    {
        return _people.Values.OrderBy(person => person.Name);
    }

    public Person? GetById(Guid id)
    {
        return _people.GetValueOrDefault(id);
    }

    public Person Create(PersonRequest request)
    {
        var person = new Person(
            Guid.NewGuid(),
            request.Name.Trim(),
            request.Age,
            CleanOptional(request.Email),
            CleanOptional(request.Phone),
            DateTime.UtcNow
        );

        _people[person.Id] = person;
        return person;
    }

    public Person? Update(Guid id, PersonRequest request)
    {
        if (!_people.TryGetValue(id, out var current))
        {
            return null;
        }

        var updated = current with
        {
            Name = request.Name.Trim(),
            Age = request.Age,
            Email = CleanOptional(request.Email),
            Phone = CleanOptional(request.Phone)
        };

        _people[id] = updated;
        return updated;
    }

    public bool Delete(Guid id)
    {
        return _people.TryRemove(id, out _);
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
