import {
  authSchema,
  loginSchema,
  newPassWordSchema,
  signupSchema,
} from "@/validation/auth-schema";
import { describe, test, expect } from "vitest";

describe("authSchema", () => {
  test("should pass with a valid email", () => {
    expect(() => authSchema.parse({ email: "user@example.com" })).not.toThrow();
  });

  test("should pass with a subdomain email", () => {
    expect(() =>
      authSchema.parse({ email: "user@mail.example.co.uk" }),
    ).not.toThrow();
  });

  test("should fail with an invalid email format", () => {
    expect(() => authSchema.parse({ email: "not-an-email" })).toThrow(
      "Email non valida.",
    );
  });

  test("should fail with an empty string email", () => {
    expect(() => authSchema.parse({ email: "" })).toThrow("Email non valida.");
  });

  test("should fail when email is missing the domain", () => {
    expect(() => authSchema.parse({ email: "user@" })).toThrow(
      "Email non valida.",
    );
  });
});

describe("newPassWordSchema", () => {
  test("should pass when passwords match and meet minimum length", () => {
    expect(() =>
      newPassWordSchema.parse({
        password: "secret",
        confirmPassword: "secret",
      }),
    ).not.toThrow();
  });

  test("should pass with a long password", () => {
    expect(() =>
      newPassWordSchema.parse({
        password: "a-very-long-password-123!",
        confirmPassword: "a-very-long-password-123!",
      }),
    ).not.toThrow();
  });

  test("should fail when password is shorter than 6 characters", () => {
    expect(() =>
      newPassWordSchema.parse({ password: "abc", confirmPassword: "abc" }),
    ).toThrow("Password deve contenere almeno 6 caratteri.");
  });

  test("should fail when passwords do not match", () => {
    expect(() =>
      newPassWordSchema.parse({
        password: "password1",
        confirmPassword: "password2",
      }),
    ).toThrow("Le password non corrispondono.");
  });

  test("should fail when password is valid length but confirmPassword differs", () => {
    const result = newPassWordSchema.safeParse({
      password: "validpassword",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword",
      );
      expect(confirmError?.message).toBe("Le password non corrispondono.");
    }
  });
});

describe("loginSchema", () => {
  test("should pass with valid email and any password", () => {
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "any" }),
    ).not.toThrow();
  });

  test("should fail with invalid email", () => {
    expect(() =>
      loginSchema.parse({ email: "bad-email", password: "password" }),
    ).toThrow("Email non valida.");
  });

  test("should fail when email is missing", () => {
    expect(() =>
      loginSchema.parse({ email: undefined, password: "password" }),
    ).toThrow();
  });
});

describe("signupSchema", () => {
  test("should pass with valid email and matching passwords", () => {
    expect(() =>
      signupSchema.parse({
        email: "user@example.com",
        password: "mypassword",
        confirmPassword: "mypassword",
      }),
    ).not.toThrow();
  });

  test("should fail when passwords do not match", () => {
    expect(() =>
      signupSchema.parse({
        email: "user@example.com",
        password: "mypassword",
        confirmPassword: "wrongpassword",
      }),
    ).toThrow("Le password non corrispondono.");
  });

  test("should fail with invalid email", () => {
    const result = signupSchema.safeParse({
      email: "bad",
      password: "mypassword",
      confirmPassword: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  test("should fail with short password", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "123",
      confirmPassword: "123",
    });
    expect(result.success).toBe(false);
  });
});
