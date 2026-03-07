# Mermaid Diagram Examples

This file demonstrates Mermaid diagram support in the viewer.

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix the bug]
    E --> B
    C --> F[Ship it]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant Server
    participant DB

    Browser->>Server: GET /api/files
    Server->>DB: scan .md files
    DB-->>Server: file list
    Server-->>Browser: JSON response
    Browser->>Server: GET /files/README.md
    Server-->>Browser: markdown content
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements       :done,    req,  2024-01-01, 2024-01-07
    Design             :done,    des,  2024-01-08, 2024-01-14
    section Development
    Backend            :active,  be,   2024-01-15, 2024-01-28
    Frontend           :         fe,   2024-01-22, 2024-02-04
    section Release
    Testing            :         test, 2024-02-05, 2024-02-11
    Deploy             :         dep,  2024-02-12, 2024-02-13
```

## Pie Chart

```mermaid
pie title Programming Languages Used
    "Python" : 42
    "JavaScript" : 35
    "TypeScript" : 15
    "Other" : 8
```

## Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +bool indoor
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetch file
    Loading --> Rendering : content received
    Loading --> Error : request failed
    Rendering --> Idle : done
    Error --> Idle : retry
    Idle --> [*]
```

## Entity Relationship

```mermaid
erDiagram
    FILE {
        string path PK
        string title
        int lines
        string folder
    }
    FOLDER {
        string path PK
        string name
    }
    FILE }o--|| FOLDER : "belongs to"
```
